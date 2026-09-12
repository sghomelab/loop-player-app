let expoFS = null;
try { expoFS = require('expo-file-system'); } catch (e) { expoFS = null; }

function isNewAPI() {
  return expoFS && expoFS.Paths && (expoFS.File || expoFS.Directory);
}

const legacyAdapter = {};

if (isNewAPI()) {
  const { File, Directory, Paths } = expoFS;
  const documentDir = Paths.document;

  legacyAdapter.documentDirectory = documentDir.uri;
  legacyAdapter.cacheDirectory = Paths.cache ? Paths.cache.uri : null;

  legacyAdapter.readDirectoryAsync = async (dirUri) => {
    try {
      const dir = new Directory(dirUri);
      const entries = dir.list();
      return entries.map((e) => Paths.basename(e.uri));
    } catch (e) {
      return [];
    }
  };

  legacyAdapter.copyAsync = async ({ from, to }) => {
    const src = new File(from);
    const dest = new File(to);
    if (src.exists) {
      src.copy(dest);
    } else {
      throw new Error('Source file does not exist: ' + from);
    }
  };

  legacyAdapter.deleteAsync = async (uri, options) => {
    const f = new File(uri);
    if (f.exists) f.delete();
  };

  legacyAdapter.getInfoAsync = async (uri) => {
    try {
      const info = Paths.info(uri);
      return { exists: !!info && !!info.exists, size: info ? info.size : 0, isDirectory: !!info && !!info.isDirectory };
    } catch (e) {
      return { exists: false, size: 0 };
    }
  };

  legacyAdapter.makeDirectoryAsync = async (uri, options) => {
    try {
      const d = new Directory(uri);
      if (!d.exists) d.create({ intermediates: true, idempotent: true });
    } catch (e) {}
  };

  legacyAdapter.writeAsStringAsync = async (uri, content) => {
    const f = new File(uri);
    if (f.exists) f.delete();
    f.write(content);
  };

  legacyAdapter.readAsStringAsync = async (uri) => {
    const f = new File(uri);
    return f.exists ? await f.text() : '';
  };
}

export { legacyAdapter as FileSystemAdapter, isNewAPI };