const {
  addDoc,
  collection,
  doc,
  updateDoc,
  serverTimestamp,
} = require("firebase/firestore");
const { firestore } = require("./index");

module.exports.createNode = async function createNode(name, content, uid) {
  const file = {
    content,
    type: "note",
  };
  const newNode = {
    name,
    file,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: serverTimestamp(),
    permission: {
      admins: [uid],
    },
    isDeleted: false,
  };
  const docRef = await addDoc(collection(firestore, "filesystem"), newNode);
  return docRef;
};
