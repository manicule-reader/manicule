-- Dev-only wipes book data and reloads a known sample

TRUNCATE books RESTART IDENTITY CASCADE;

INSERT INTO books (gutenberg_id, title, author)
VALUES (1342, 'Pride and Prejudice', 'Jane Austen');

INSERT INTO passages (book_id, seq, body) VALUES
(1, 1, $$It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.$$),
(1, 2, $$However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.$$),
(1, 3, $$"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"$$),
(1, 4, $$Mr. Bennet replied that he had not.$$),
(1, 5, $$"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."$$),
(1, 6, $$Mr. Bennet made no answer.$$),
(1, 7, $$"Do you not want to know who has taken it?" cried his wife impatiently.$$),
(1, 8, $$"You want to tell me, and I have no objection to hearing it."$$),
(1, 9, $$This was invitation enough.$$);