// "/read/1/2".split("/") changed to ["", "read", "1", "2"]
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