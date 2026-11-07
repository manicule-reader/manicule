-- Dev-only wipes book data and reloads a known sample

TRUNCATE books RESTART IDENTITY CASCADE;

INSERT INTO books (gutenberg_id, title, author)
VALUES (1342, 'Pride and Prejudice', 'Jane Austen');

INSERT INTO sections (book_id, seq, title) VALUES
(1, 1, 'Chapter I'),
(1, 2, 'Chapter II');

INSERT INTO passages (book_id, section_id, seq, body) VALUES
(1, 1, 1, $$It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.$$),
(1, 1, 2, $$However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.$$),
(1, 1, 3, $$"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"$$),
(1, 1, 4, $$Mr. Bennet replied that he had not.$$),
(1, 1, 5, $$"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."$$),
(1, 1, 6, $$Mr. Bennet made no answer.$$),
(1, 1, 7, $$"Do you not want to know who has taken it?" cried his wife impatiently.$$),
(1, 1, 8, $$"You want to tell me, and I have no objection to hearing it."$$),
(1, 1, 9, $$This was invitation enough.$$),
(1, 2, 10, $$Mr. Bennet was among the earliest of those who waited on Mr. Bingley. He had always intended to visit him, though to the last always assuring his wife that he should not go; and till the evening after the visit was paid she had no knowledge of it.$$),
(1, 2, 11, $$It was then disclosed in the following manner. Observing his second daughter employed in trimming a hat, he suddenly addressed her with:$$),
(1, 2, 12, $$"I hope Mr. Bingley will like it, Lizzy."$$);