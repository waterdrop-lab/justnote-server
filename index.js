require("dotenv").config();
const mongoose = require("mongoose");
const Folder = require("./models/Folder");
const Note = require("./models/Note");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require("./pure-note-firebase-5d0047ef3e5a.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function getFolders(userId) {
  console.log("loading");
  const folders = await Folder.getFolders(userId);
  console.log("loaded");
  return folders;
}
async function getNote(folderId, callback) {
  const { note } = await Note.getNote(folderId);
  return note;
}

async function main() {
  const folders = await getFolders("66a3ab2439b0768854de6050");
  console.log(`${folders.length} folders loaded`);
  const notes = folders.map((folder) => ({ folder, note: null }));
  for (const note of notes) {
    note.note = await getNote(note.folder._id);
  }

  const fireNotes = notes.filter((n) => !!n.note);

  for (const { note, folder } of fireNotes) {
    const file = {
      content: note.content,
      type: "note",
    };
    const newNode = {
      name: folder.name,
      file,
      createdAt: new Date(folder.createdAt),
      updatedAt: new Date(folder.updatedAt),
      deletedAt: folder.deletedAt
        ? new Date(folder.deletedAt)
        : new Date(folder.createdAt),
      permission: {
        admins: ["KO2pXAEEOod5SrW700sFWZfmRDC2"],
      },
      isDeleted: false,
    };
    // Add a new document with a generated id.
    await db.collection("filesystem").add(newNode);
  }

  console.log("done");
}

main().then(() => {
  process.exit(0);
});
