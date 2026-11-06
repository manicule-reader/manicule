const id = location.pathname.split("/").pop();
const res = await fetch(`/api/books/${id}`);

if (!res.ok) {
  document.querySelector("#title").textContent = "Book not found";
} else {
  const book = await res.json();
  document.title = `${book.title} · Manicule`;
  document.querySelector("#title").textContent = book.title;
  document.querySelector("#author").textContent = book.author;

  const main = document.querySelector("#text");
  for (const p of book.passages) {
    const el = document.createElement("p");
    el.className = "passage";
    el.dataset.pid = p.id;
    el.dataset.seq = p.seq;
    el.textContent = p.body;
    main.append(el);
  }
}