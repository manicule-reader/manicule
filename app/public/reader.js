// "/read/1/2".split("/") changed to ["", "read", "1", "2"]
const [, , bookId, sectionSeq] = location.pathname.split("/");
// which reading group's highlights to show (/read/1/2?group=5)
const groupId = new URLSearchParams(location.search).get("group");

const $ = (sel) => document.querySelector(sel);

// passage id -> raw body text from the API (offsets are measured against this)
const bodies = new Map();
// passage id -> that passage's .pbody element
const bodyEls = new Map();
// passage id -> [{ id, start_offset, end_offset }, ...]
const threadsByPassage = new Map();

function link(href, text) {
  const a = document.createElement("a");
  a.href = href;
  a.textContent = text;
  return a;
}

// keep ?group= when moving between sections
function readerUrl(seq) {
  const base = seq == null ? `/read/${bookId}` : `/read/${bookId}/${seq}`;
  return groupId ? `${base}?group=${groupId}` : base;
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
  if (data.prev) nav.append(link(readerUrl(data.prev), "« prev"));
  nav.append(link(readerUrl(null), "contents"));
  if (data.next) nav.append(link(readerUrl(data.next), "next »"));
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
    li.append(link(readerUrl(s.seq), s.title ?? `Section ${s.seq}`));
    list.append(li);
  }
  $("#text").append(list);
}

// ---------- highlights ----------

// Fill a .pbody with the passage text, wrapping highlighted ranges in <mark>.
// Overlapping highlights: cut the text at every start/end offset, then each
// piece is marked with whichever threads cover it. No nested marks.
function renderBody(pid) {
  const text = bodies.get(pid);
  const el = bodyEls.get(pid);
  const threads = threadsByPassage.get(pid) ?? [];

  const cuts = new Set([0, text.length]);
  for (const t of threads) {
    cuts.add(Math.min(t.start_offset, text.length));
    cuts.add(Math.min(t.end_offset, text.length));
  }
  const points = [...cuts].sort((a, b) => a - b);

  el.replaceChildren();
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const piece = text.slice(from, to);
    const covering = threads.filter(
      (t) => t.start_offset <= from && t.end_offset >= to
    );

    if (covering.length === 0) {
      el.append(piece);
    } else {
      const mark = document.createElement("mark");
      mark.className = "hl";
      mark.dataset.threads = covering.map((t) => t.id).join(",");
      if (covering.length > 1) mark.classList.add("hl-overlap");
      mark.textContent = piece;
      el.append(mark);
    }
  }
}

async function loadThreads() {
  if (!groupId) return;
  const res = await fetch(`/api/groups/${groupId}/sections/${sectionSeq}/threads`);
  if (!res.ok) {
    // 401 = not logged in, 403 = not in this group: just read without highlights
    console.warn("Could not load highlights:", res.status);
    return;
  }
  const { threads } = await res.json();
  for (const t of threads) {
    if (!threadsByPassage.has(t.passage_id)) threadsByPassage.set(t.passage_id, []);
    threadsByPassage.get(t.passage_id).push(t);
  }
}

async function showSection() {
  const res = await fetch(`/api/books/${bookId}/sections/${sectionSeq}`);
  if (!res.ok) return notFound();
  const data = await res.json();

  setHeader(data.book.title, data.book.author);
  document.title = `${data.section.title} · ${data.book.title} · Manicule`;
  $("#section-title").textContent = data.section.title;

  await loadThreads();

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
    el.append(label, body);
    $("#text").append(el);

    bodies.set(p.id, p.body);
    bodyEls.set(p.id, body);
    renderBody(p.id);
  }

  document.getElementById(location.hash.slice(1))?.scrollIntoView();

  renderNav(data);
}

// ---------- selection -> comment popover ----------

const popover = document.createElement("div");
popover.className = "hl-popover";
popover.hidden = true;
document.body.append(popover);

let pending = null; // { passage_id, start_offset, end_offset }

function hidePopover() {
  popover.hidden = true;
  popover.replaceChildren();
  pending = null;
}

function showPopoverAt(rect) {
  popover.hidden = false;
  popover.style.top = `${rect.bottom + window.scrollY + 6}px`;
  popover.style.left = `${rect.left + window.scrollX}px`;
}

function showCommentButton(rect) {
  const btn = document.createElement("button");
  btn.textContent = "Comment";
  btn.addEventListener("click", showCommentForm);
  popover.replaceChildren(btn);
  showPopoverAt(rect);
}

function showCommentForm() {
  const form = document.createElement("form");
  const box = document.createElement("textarea");
  box.rows = 3;
  box.placeholder = "Start a thread on this passage…";
  box.required = true;
  const save = document.createElement("button");
  save.type = "submit";
  save.textContent = "Save";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", hidePopover);
  const err = document.createElement("p");
  err.className = "hl-error";

  form.append(box, save, cancel, err);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!pending) return;
    save.disabled = true;
    err.textContent = "";

    const res = await fetch(`/api/groups/${groupId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...pending, body: box.value }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      err.textContent = json.error ?? "Could not save comment";
      save.disabled = false;
      return;
    }

    const t = json.thread;
    if (!threadsByPassage.has(t.passage_id)) threadsByPassage.set(t.passage_id, []);
    threadsByPassage.get(t.passage_id).push(t);
    renderBody(t.passage_id);
    window.getSelection().removeAllRanges();
    hidePopover();
  });

  popover.replaceChildren(form);
  box.focus();
}

// Selection -> { passage_id, start_offset, end_offset }, or null if the
// selection doesn't start inside a passage body.
function selectionToOffsets(sel) {
  if (sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);

  // (triple-click, drag starting at an edge)
  const node = range.startContainer;
  const startEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  const pbody = startEl?.closest(".pbody");
  if (!pbody) return null;

  // if the selection runs past this paragraph trim it to the paragraph's end
  let r = range;
  if (!pbody.contains(range.endContainer)) {
    r = range.cloneRange();
    r.setEnd(pbody, pbody.childNodes.length);
  }

  // characters from start of paragraph text to the selection start
  // (counts straight through any <mark>s already in the paragraph)
  const before = document.createRange();
  before.setStart(pbody, 0);
  before.setEnd(r.startContainer, r.startOffset);
  const start = before.toString().length;
  const end = start + r.toString().length;
  if (!r.toString().trim()) return null;

  return {
    passage_id: Number(pbody.parentElement.dataset.pid),
    start_offset: start,
    end_offset: end,
    rect: r.getBoundingClientRect(),
  };
}

if (sectionSeq) {
  await showSection();

  if (groupId) {
    document.addEventListener("mouseup", (e) => {
      if (popover.contains(e.target)) return;
      // let browser finish updating the selection
      setTimeout(() => {
        const hit = selectionToOffsets(window.getSelection());
        if (!hit) return hidePopover();
        const { rect, ...offsets } = hit;
        pending = offsets;
        showCommentButton(rect);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hidePopover();
    });
  }
} else {
  await showContents();
}