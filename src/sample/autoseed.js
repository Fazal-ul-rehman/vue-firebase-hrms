// src/sample/autoseed.js
import { setDoc, doc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'

export default async function seedRunner(auth, db){
  const defaultUsers = [
    { email:'ceo@company.com', password:'123456', name:'CEO User', role:'CEO' },
    { email:'cfo@company.com', password:'123456', name:'CFO User', role:'CFO' },
    { email:'coo@company.com', password:'123456', name:'COO User', role:'COO' },
    { email:'manager@company.com', password:'123456', name:'Manager User', role:'Manager' },
    { email:'employee1@company.com', password:'123456', name:'Employee One', role:'Employee' },
    { email:'employee2@company.com', password:'123456', name:'Employee Two', role:'Employee' },
    { email:'employee3@company.com', password:'123456', name:'Employee Three', role:'Employee' }
  ]

  for(const u of defaultUsers){
    try{
      const cred = await createUserWithEmailAndPassword(auth,u.email,u.password)
      await setDoc(doc(db,'users',cred.user.uid), {
        name:u.name, email:u.email, role:u.role, createdAt: new Date()
      })
    }catch(e){
      console.warn('Skipping user (maybe exists):', u.email, e.message)
      try {
        const login = await signInWithEmailAndPassword(auth,u.email,u.password)
        await setDoc(doc(db,'users',login.user.uid), {
          name:u.name, email:u.email, role:u.role, createdAt: new Date()
        })
      } catch {}
    }
  }

  await signOut(auth)
}
