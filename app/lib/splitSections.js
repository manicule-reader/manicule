//markers that wrap the real book text
const START_RE = /^\*\*\* ?START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*$/im;
const END_RE = /^\*\*\* ?END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*$/im;

//heading like "CHAPTER IV", "Book 2", "PART THE FIRST", optionally with a title on the same line
const KEYWORD_HEADING_RE = /^(chapter|book|part|volume|letter|act|scene|canto|stave|section)\s+(the\s+)?([ivxlcdm]+|\d+|one|two|three|four|five|six|seven|eight|nine|ten|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b.{0,60}$/i;
//bare roman numeral heading like "XII." (case sensitive so ordinary words are not matched)
const ROMAN_HEADING_RE = /^[IVXLCDM]+\.?$/;

function stripBoilerplate(raw) {
  let text = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const start = START_RE.exec(text);
  if (start) text = text.slice(start.index + start[0].length);
  const end = END_RE.exec(text);
  if (end) text = text.slice(0, end.index);
  return text.trim();
}

function headingTitle(block) {
  //a heading block is short: the heading line plus at most a subtitle line or two
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0 || lines.length > 3) return null;
  const joined = lines.join(' ');
  if (joined.length > 100) return null;
  if (KEYWORD_HEADING_RE.test(lines[0]) || ROMAN_HEADING_RE.test(lines[0])) return joined;
  return null;
}

//"Chapter I.]" -> "Chapter I", "CHAPTER XIV." -> "Chapter XIV"
function cleanTitle(title) {
  let t = title.replace(/[\[\]]/g, '').replace(/\.\s*$/, '').trim();
  //only fix the casing of the leading keyword, so roman numerals and subtitles are left alone
  if (KEYWORD_HEADING_RE.test(t)) {
    t = t.replace(/^[A-Za-z]+/, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
  }
  return t;
}

//returns [{ title, passages: [string, ...] }, ...]
function splitSections(raw) {
  const text = stripBoilerplate(raw);
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

  const items = blocks.map(b => {
    const title = headingTitle(b);
    if (title) return { heading: title };
    //skip illustration markers
    if (/^\[Illustration.*\]$/is.test(b)) return { skip: true };
    //join hard-wrapped lines into one paragraph
    return { para: b.split('\n').map(l => l.trim()).join(' ').replace(/\s+/g, ' ') };
  });

  //drop headings directly followed by another heading (table of contents entries)
  const cleaned = items
  .filter(it => !it.skip)
  .filter((it, i, arr) => !(it.heading && arr[i + 1] && arr[i + 1].heading));

  const sections = [];
  let current = null;
  for (const it of cleaned) {
    if (it.heading) {
      current = { title: cleanTitle(it.heading), passages: [] };
      sections.push(current);
    } else {
      //anything before the first heading goes in a front matter section
      if (!current) {
        current = { title: 'Front Matter', passages: [] };
        sections.push(current);
      }
      current.passages.push(it.para);
    }
  }
  return sections.filter(s => s.passages.length > 0);
}

module.exports = { stripBoilerplate, splitSections };