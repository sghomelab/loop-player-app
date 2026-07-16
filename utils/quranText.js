const API_BASE = 'https://api.alquran.cloud/v1';

async function fetchSurah(surahNumber) {
  try {
    const res = await fetch(`${API_BASE}/surah/${surahNumber}/editions/quran-uthmani`);
    const data = await res.json();
    if (data.code !== 200) return null;
    const surah = data.data.data[0];
    return {
      number: surah.number,
      name: surah.name,
      englishName: surah.englishName,
      englishNameTranslation: surah.englishNameTranslation,
      numberOfAyahs: surah.numberOfAyahs,
      revelationType: surah.revelationType,
      ayahs: surah.ayahs.map(a => ({
        number: a.number,
        numberInSurah: a.numberInSurah,
        text: a.text,
        edition: a.edition,
      })),
    };
  } catch (e) {
    console.error('fetchSurah error:', e);
    return null;
  }
}

async function fetchAyah(surahNumber, ayahNumber) {
  try {
    const res = await fetch(`${API_BASE}/ayah/${surahNumber}/${ayahNumber}/quran-uthmani`);
    const data = await res.json();
    if (data.code !== 200) return null;
    const ayah = data.data.data[0];
    return {
      number: ayah.number,
      numberInSurah: ayah.numberInSurah,
      surah: { number: ayah.surah.number, name: ayah.surah.name },
      text: ayah.text,
    };
  } catch (e) {
    console.error('fetchAyah error:', e);
    return null;
  }
}

async function searchSurah(query) {
  try {
    const res = await fetch(`${API_BASE}/surah?search=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.code !== 200) return [];
    return data.data.data.map(s => ({
      number: s.number,
      name: s.name,
      englishName: s.englishName,
      englishNameTranslation: s.englishNameTranslation,
      numberOfAyahs: s.numberOfAyahs,
    }));
  } catch (e) {
    console.error('searchSurah error:', e);
    return [];
  }
}

function getAyahIndex(surahNumber, ayahNumber) {
  return ((surahNumber - 1) * 10000) + (ayahNumber - 1);
}

export { fetchSurah, fetchAyah, searchSurah, getAyahIndex, API_BASE };