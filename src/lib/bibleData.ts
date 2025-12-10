
export const BIBLE_BOOKS = [
  { name: 'Genesis', chapters: 50 },
  { name: 'Exodus', chapters: 40 },
  { name: 'Leviticus', chapters: 27 },
  { name: 'Numbers', chapters: 36 },
  { name: 'Deuteronomy', chapters: 34 },
  { name: 'Joshua', chapters: 24 },
  { name: 'Judges', chapters: 21 },
  { name: 'Ruth', chapters: 4 },
  { name: '1 Samuel', chapters: 31 },
  { name: '2 Samuel', chapters: 24 },
  { name: '1 Kings', chapters: 22 },
  { name: '2 Kings', chapters: 25 },
  { name: '1 Chronicles', chapters: 29 },
  { name: '2 Chronicles', chapters: 36 },
  { name: 'Ezra', chapters: 10 },
  { name: 'Nehemiah', chapters: 13 },
  { name: 'Esther', chapters: 10 },
  { name: 'Job', chapters: 42 },
  { name: 'Psalms', chapters: 150 },
  { name: 'Proverbs', chapters: 31 },
  { name: 'Ecclesiastes', chapters: 12 },
  { name: 'Song of Solomon', chapters: 8 },
  { name: 'Isaiah', chapters: 66 },
  { name: 'Jeremiah', chapters: 52 },
  { name: 'Lamentations', chapters: 5 },
  { name: 'Ezekiel', chapters: 48 },
  { name: 'Daniel', chapters: 12 },
  { name: 'Hosea', chapters: 14 },
  { name: 'Joel', chapters: 3 },
  { name: 'Amos', chapters: 9 },
  { name: 'Obadiah', chapters: 1 },
  { name: 'Jonah', chapters: 4 },
  { name: 'Micah', chapters: 7 },
  { name: 'Nahum', chapters: 3 },
  { name: 'Habakkuk', chapters: 3 },
  { name: 'Zephaniah', chapters: 3 },
  { name: 'Haggai', chapters: 2 },
  { name: 'Zechariah', chapters: 14 },
  { name: 'Malachi', chapters: 4 },
  { name: 'Matthew', chapters: 28 },
  { name: 'Mark', chapters: 16 },
  { name: 'Luke', chapters: 24 },
  { name: 'John', chapters: 21 },
  { name: 'Acts', chapters: 28 },
  { name: 'Romans', chapters: 16 },
  { name: '1 Corinthians', chapters: 16 },
  { name: '2 Corinthians', chapters: 13 },
  { name: 'Galatians', chapters: 6 },
  { name: 'Ephesians', chapters: 6 },
  { name: 'Philippians', chapters: 4 },
  { name: 'Colossians', chapters: 4 },
  { name: '1 Thessalonians', chapters: 5 },
  { name: '2 Thessalonians', chapters: 3 },
  { name: '1 Timothy', chapters: 6 },
  { name: '2 Timothy', chapters: 4 },
  { name: 'Titus', chapters: 3 },
  { name: 'Philemon', chapters: 1 },
  { name: 'Hebrews', chapters: 13 },
  { name: 'James', chapters: 5 },
  { name: '1 Peter', chapters: 5 },
  { name: '2 Peter', chapters: 3 },
  { name: '1 John', chapters: 5 },
  { name: '2 John', chapters: 1 },
  { name: '3 John', chapters: 1 },
  { name: 'Jude', chapters: 1 },
  { name: 'Revelation', chapters: 22 },
];

export function getBookIndex(name: string): number {
  return BIBLE_BOOKS.findIndex(b => b.name === name);
}

export function generateReadingPlan(
  startBook: string,
  startChapter: number,
  endBook: string,
  endChapter: number,
  chaptersPerDay: number
): { day: number; reference: string; firstVerseReference: string }[] {
  const plan: { day: number; reference: string; firstVerseReference: string }[] = [];
  let currentBookIndex = getBookIndex(startBook);
  let currentChapter = startChapter;
  const endBookIndex = getBookIndex(endBook);

  if (currentBookIndex === -1 || endBookIndex === -1) {
    throw new Error('Invalid book name');
  }

  let day = 1;

  while (
    currentBookIndex < endBookIndex ||
    (currentBookIndex === endBookIndex && currentChapter <= endChapter)
  ) {
    let chaptersToday = 0;
    const startRef = `${BIBLE_BOOKS[currentBookIndex].name} ${currentChapter}`;
    const firstVerseReference = `${startRef}:1`;
    let endRef = '';

    while (chaptersToday < chaptersPerDay) {
      if (
        currentBookIndex > endBookIndex ||
        (currentBookIndex === endBookIndex && currentChapter > endChapter)
      ) {
        break;
      }

      endRef = `${BIBLE_BOOKS[currentBookIndex].name} ${currentChapter}`;
      
      currentChapter++;
      if (currentChapter > BIBLE_BOOKS[currentBookIndex].chapters) {
        currentBookIndex++;
        currentChapter = 1;
        if (currentBookIndex >= BIBLE_BOOKS.length) break;
      }
      chaptersToday++;
    }

    // Format reference
    // If single chapter: "Genesis 1"
    // If range in same book: "Genesis 1-3"
    // If across books: "Genesis 50 - Exodus 2" (Simplified: just show start-end)
    
    // Actually, let's keep it simple. If it spans books, it might be messy to display "Genesis 50 - Exodus 2".
    // But for now, let's just use the start and end of the reading.
    
    let reference = startRef;
    if (endRef && endRef !== startRef) {
        // Check if same book
        const startParts = startRef.split(' ');
        const endParts = endRef.split(' ');
        const startBookName = startParts.slice(0, -1).join(' ');
        const endBookName = endParts.slice(0, -1).join(' ');
        
        if (startBookName === endBookName) {
            reference = `${startBookName} ${startParts[startParts.length-1]}-${endParts[endParts.length-1]}`;
        } else {
            reference = `${startRef} - ${endRef}`;
        }
    }

    plan.push({ day, reference, firstVerseReference });
    day++;
  }

  return plan;
}
