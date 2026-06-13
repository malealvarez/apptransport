import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

    const firebaseConfig = {
        apiKey: "AIzaSyATJtGEm89AnYStEFS4CxaEkSGURfct9Po",
        authDomain: "transporteapp-a7d46.firebaseapp.com",
        projectId: "transporteapp-a7d46",
        storageBucket: "transporteapp-a7d46.firebasestorage.app",
        messagingSenderId: "297301260609",
        appId: "1:297301260609:web:961151786e987e3451c9c0"
    };

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);