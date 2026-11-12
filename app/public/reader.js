// "/read/1/2".split("/") changed to ["", "read", "1", "2"]

// highlight test
const bodies = new Map();

const [, , bookId, sectionSeq] = location.pathname.split("/");
const $ = (sel) => document.querySelector(sel);

function link(href, text) {
  const a = document.createElement("a");
  a.href = href;
  a.textContent = text;
  return a;
}

function setHeader(title, author) {
  $("#title").textContent = title;
  $("#author").textContent = author;
}

function notFound() {
  $("#title").textContent = "Not found";
}

function renderNav(data) {
  const nav = $(".chapter-nav");
  if (data.prev) nav.append(link(`/read/${bookId}/${data.prev}`, "« prev"));
  nav.append(link(`/read/${bookId}`, "contents"));
  if (data.next) nav.append(link(`/read/${bookId}/${data.next}`, "next »"));
}

async function showContents() {
  const res = await fetch(`/api/books/${bookId}`);
  if (!res.ok) return notFound();
  const book = await res.json();

  setHeader(book.title, book.author);
  document.title = `${book.title} · Manicule`;
  $("#section-title").textContent = "Contents";

  const list = document.createElement("ol");
  for (const s of book.sections) {
    const li = document.createElement("li");
    li.append(link(`/read/${bookId}/${s.seq}`, s.title ?? `Section ${s.seq}`));
    list.append(li);
  }
  $("#text").append(list);
}

async function showSection() {
  const res = await fetch(`/api/books/${bookId}/sections/${sectionSeq}`);
  if (!res.ok) return notFound();
  const data = await res.json();

  setHeader(data.book.title, data.book.author);
  document.title = `${data.section.title} · ${data.book.title} · Manicule`;
  $("#section-title").textContent = data.section.title;

  for (const p of data.passages) {
    // highlight test
    bodies.set(p.id, p.body);
    // ...
    const el = document.createElement("p");
    el.className = "passage";
    el.dataset.pid = p.id;
    el.dataset.seq = p.seq;
    el.id = `p${p.seq}`;
    const label = link(`#p${p.seq}`, p.seq);
    label.className = "plabel";
    const body = document.createElement("span");
    body.className = "pbody";
    body.textContent = p.body;
    el.append(label, body);
    $("#text").append(el);
  }
  
  document.getElementById(location.hash.slice(1))?.scrollIntoView();

  renderNav(data);
}

if (sectionSeq) {
  await showSection();
} else {
  await showContents();
}

if (sectionSeq) {
  document.addEventListener("mouseup", () => {
    const sel = window.getSelection();
    if (sel.isCollapsed) return;
    const range = sel.getRangeAt(0);

    const pbody = range.startContainer.parentElement?.closest(".pbody");
    if (!pbody) return;

    // if the selection runs past this paragraph trim it to the paragraph's end
    let r = range;
    if (!pbody.contains(range.endContainer)) {
      r = range.cloneRange();
      r.setEnd(pbody, pbody.childNodes.length);
    }

    // characters from start of par text to the selection start
    const before = document.createRange();
    before.setStart(pbody, 0);
    before.setEnd(r.startContainer, r.startOffset);
    const start = before.toString().length;
    const end = start + r.toString().length;

    // console.log({
    //   passage_id: Number(pbody.parentElement.dataset.pid),
    //   start_offset: start,
    //   end_offset: end,
    //   text: range.toString(),
    // });

    const pid = Number(pbody.parentElement.dataset.pid);
    const fromBody = bodies.get(pid).slice(start, end);
    const ok = fromBody === r.toString();
    console.log(ok ? "✓" : "X", { pid, start, end, selected: r.toString(), fromBody });
  });
}