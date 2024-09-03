import { useState, useEffect, useRef } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { getFirestore, onSnapshot, collection, orderBy, serverTimestamp, query, addDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { auth, app } from "../firebase";

const db = getFirestore(app);

function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp"));
    const unsubscribe = onSnapshot(q, snapshot => {
      setMessages(snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      })));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        setUser(user);

        const usersQuery = query(collection(db, "users"), orderBy("displayName"));
        const unsubscribeUsers = onSnapshot(usersQuery, snapshot => {
          const usersList = snapshot.docs.map(doc => ({
            uid: doc.id,
            displayName: doc.data().displayName,
            photoURL: doc.data().photoURL
          }));
          setUsers(usersList);
        });
        return unsubscribeUsers;
      } else {
        setUser(null);
        setUsers([]);
      }
    });

    return unsubscribe;
  }, []);

  const sendMessage = async () => {
    if (newMessage.trim() === "") {
      return; 
    }

    try {
      await addDoc(collection(db, "messages"), {
        uid: user.uid,
        photoURL: user.photoURL,
        displayName: user.displayName,
        text: newMessage,
        timestamp: serverTimestamp(),
        to: selectedUser ? selectedUser.uid : null 
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Add user to Firestore if not already present
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          displayName: user.displayName,
          photoURL: user.photoURL,
          email: user.email,
        });
      }
    } catch (error) {
      console.error("Error during sign-in: ", error);
    }
  };

  const filteredMessages = selectedUser
    ? messages.filter(msg => 
        (msg.data.uid === user.uid && msg.data.to === selectedUser.uid) ||
        (msg.data.uid === selectedUser.uid && msg.data.to === user.uid)
      )
    : [];

  useEffect(() => {
    if (endOfMessagesRef.current && selectedUser) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredMessages, selectedUser]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen w-screen">
      {user ? (
        <>
          {/* Side Menu Button (Mobile Only) */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="fixed top-4 left-4 z-50 px-4 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-800 md:hidden"
          >
            ☰
          </button>

          {/* Side Menu Panel (Always Open on Desktop) */}
          <div className={`fixed top-0 left-0 h-full w-64 bg-gray-800 text-white p-4 overflow-y-auto transition-transform transform ${menuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:w-64 z-40`}>
            <div className="text-center text-xl font-bold mb-4">Users</div>
            {users.map(u => (
              <div
                key={u.uid}
                onClick={() => {
                  setSelectedUser(u);
                  setMenuOpen(false); 
                }}
                className={`p-2 cursor-pointer ${selectedUser?.uid === u.uid ? 'bg-gray-700 rounded-lg' : 'hover:bg-gray-700 rounded'}`}
              >
                <img
                  src={u.photoURL}
                  alt="User"
                  className="w-8 h-8 rounded-full inline-block mr-2"
                />
                <span>{u.displayName}</span>
              </div>
            ))}
          </div>

          {/* Chat Panel */}
          <div className="absolute top-4 right-4 flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
                  <span className="flex items-center space-x-2">
                    <img
                      src={user.photoURL}
                      alt="User"
                      className="w-8 h-8 rounded-full"
                    />
                    {/* <span>{user.displayName}</span> */}
                    <button
                    onClick={() => auth.signOut()}
                    className="px-4 py-2 bg-gray-700 text-white rounded-2xl hover:bg-gray-800"
                  >
                    Logout
                  </button>
                  </span>
                  
                </div>
          {selectedUser ? (
            <div className="flex flex-col flex-grow bg-gray-100 ml-0 md:ml-64">
              <div className="bg-white p-5  shadow relative flex flex-col md:flex-row md:items-center">
                {/* <div className="text-xl font-bold text-center md:flex-grow md:text-left">
                  {selectedUser ? `${selectedUser.displayName}` : ""}
                </div> */}
                <div className="flex items-center">
                    {selectedUser && (
                      <>
                        <img
                          src={selectedUser.photoURL}
                          alt="User"
                          className="w-8 h-8 rounded-full mr-2"
                        />
                        <span className="text-xl font-bold">
                          {selectedUser.displayName}
                        </span>
                      </>
                    )}
                  </div>
                <div className="absolute top-4 right-4 flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
                  <span className="flex items-center space-x-2">
                    <img
                      src={user.photoURL}
                      alt="User"
                      className="w-8 h-8 rounded-full"
                    />
                    <span>{user.displayName}</span>
                  </span>
                  <button
                    onClick={() => auth.signOut()}
                    className="px-4 py-2 bg-gray-700 text-white rounded-2xl hover:bg-gray-800"
                  >
                    Logout
                  </button>
                </div>
              </div>
              <div className="flex-grow overflow-y-auto p-4">
                {filteredMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex items-start mb-4 ${msg.data.uid === user.uid ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.data.uid !== user.uid && (
                      <img
                        src={msg.data.photoURL}
                        alt="User"
                        className="w-8 h-8 rounded-full mr-2"
                      />
                    )}
                    <div className={`${msg.data.uid === user.uid ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'} p-3 rounded-lg max-w-xs`}>
                      <strong>{msg.data.displayName}</strong>
                      <p>{msg.data.text}</p>
                    </div>
                    {msg.data.uid === user.uid && (
                      <img
                        src={msg.data.photoURL}
                        alt="User"
                        className="w-8 h-8 rounded-full ml-2"
                      />
                    )}
                  </div>
                ))}
                <div ref={endOfMessagesRef} />
              </div>
              {/* Close Chat Button */}
              <button
                  onClick={() => setSelectedUser(null)}
                  className="fixed bottom-20 left-4 z-50 px-4 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-800"
                >
                  Close Chat
                </button>
              <div className="p-4 flex items-center">
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full px-4 py-2 border border-gray-300 rounded mr-2"
                  placeholder="Type your message here..."
                />
                <button onClick={sendMessage} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Send</button>
              </div>
            </div>
          ) : (
            <div className="flex-grow bg-gray-100 flex items-center justify-center text-center">
              <h2 className="text-2xl font-bold">Connect. Converse. Conquer.</h2>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-white">
          <h1 className='font-bold'><b>SUPERCHAT</b><br/></h1>
          <h2 className="font-semibold"><b> Connect. Converse. Conquer.</b><br/> <br/> </h2>
          <button onClick={handleLogin} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 ">Sign in with Google</button>
          <br/>
          <h2 className="font-semibold"><b> App still in development , more features will be added.</b><br/> <br/> </h2>
        </div>
      )}
    </div>
  );
}

export default App;
