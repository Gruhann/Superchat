import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase.js';
import { Menu, X, Send, LogOut, Users, PlusCircle, Copy, Share2 } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence, updateProfile } from 'firebase/auth';
import { collection, setDoc, doc, addDoc, getDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

const App = () => {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [roomKey, setRoomKey] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [newRoomKey, setNewRoomKey] = useState('');
  const [joinRoomKey, setJoinRoomKey] = useState('');
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  

  const chatContainerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        if (!user.displayName) {
          setShowUsernamePrompt(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      if (!result.user.displayName) {
        setShowUsernamePrompt(true);
      }
    } catch (error) {
      console.error('Google Sign-In failed:', error);
    }
  };

  const handleSetUsername = async () => {
    if (username.trim()) {
      try {
        await updateProfile(auth.currentUser, { displayName: username });
        setUser({ ...auth.currentUser, displayName: username });
        setShowUsernamePrompt(false);
      } catch (error) {
        console.error('Error setting username:', error);
      }
    }
  };

  const generateRoomKey = async () => {
    try {
      const generatedKey = Math.random().toString(36).substring(2, 8);
      setRoomKey(generatedKey);
      setNewRoomKey(generatedKey);

      await setDoc(doc(db, 'rooms', generatedKey), {
        roomKey: generatedKey,
        createdAt: serverTimestamp(),
        owner: user.uid,
      });
    } catch (error) {
      console.error('Error generating room key:', error);
    }
  };

  const copyRoomKey = () => {
    navigator.clipboard.writeText(newRoomKey).then(() => {
      console.log('Room key copied to clipboard!');
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  };  

  const shareRoomKey = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join My Room',
        text: `Join my chat room using the code: ${newRoomKey} https://superchat-tau-seven.vercel.app/`,
      }).catch(console.error);
    } else {
      alert(`Share this room key: ${newRoomKey}`);
    }
  };

  const joinRoom = async () => {
    if (!joinRoomKey) return;

    const roomRef = doc(db, 'rooms', joinRoomKey);
    const room = await getDoc(roomRef);

    if (room.exists()) {
      setCurrentRoom(joinRoomKey);
      setRoomKey(joinRoomKey);
      subscribeToMessages(joinRoomKey);
      setJoinRoomKey('');
    } else {
      alert('Room not found');
    }
  };

  const exitRoom = () => {
    setCurrentRoom(null);
    setRoomKey('');
    setMessages([]);
  };

  const subscribeToMessages = (roomId) => {
    const q = query(collection(db, 'rooms', roomId, 'messages'), orderBy('createdAt'));
    onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => doc.data());
      setMessages(messagesData);
    });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (message.trim() === '') return;

    try {
      await addDoc(collection(db, 'rooms', roomKey, 'messages'), {
        text: message,
        user: user.displayName || user.email,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }

    setMessage('');
  };

  const handleLogout = () => {
    signOut(auth);
    setUser(null);
    setCurrentRoom(null);
    setRoomKey('');
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="h-screen w-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition duration-200 ease-in-out z-30 w-64 bg-gray-900 text-white rounded-r-3xl`}>
        <div className="flex items-center justify-between p-4">
          <h1 className="text-3xl font-extrabold">SuperChat</h1>
          <button onClick={toggleSidebar} className="lg:hidden bg-gray-900 rounded-full">
            <X size={24} />
          </button>
        </div>
        <div className="p-4">
          {user ? (
            <>
              <div className="mb-4">
                <p className="text-xs opacity-70">Logged in as</p>
                <p className="font-semibold">{user.displayName || user.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className=" px-4 py-2 bg-white text-gray-900 rounded-full hover:bg-gray-300 transition-colors duration-200 flex items-center justify-center"
              >
                <LogOut size={18} className="mr-2" />
                Logout
              </button>
            </>
          ) : (
            <button 
              onClick={handleGoogleLogin}
              className=" px-4 py-2 bg-white text-gray-900 rounded-full hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
            >
              <Users size={18} className="mr-2" />
              Login with Google
            </button>
          )}
        </div>
        
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white shadow-lg p-4 flex justify-around items-center rounded-b-3xl">
          <button onClick={toggleSidebar} className="lg:hidden">
            <Menu size={24} />
          </button>
          {currentRoom && (
            <div className="flex items-center">
              <h2 className="text-lg font-semibold">Room: {currentRoom}</h2>
              <button 
                onClick={exitRoom}
                className="ml-4 px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm hover:bg-red-200 transition-colors duration-200"
              >
                Exit
              </button>
            </div>
          )}
        </div>

        {/* Main area */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="h-full bg-white rounded-3xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col">
            {!user ? (
              <div className="h-full flex flex-col items-center justify-center p-8">
                <img src="/logo.png" alt="SuperChat Logo" className="w-48 h-48 mb-8" />
                <h2 className="text-2xl font-extrabold mb-4">Welcome to SuperChat</h2>
                <p className="text-gray-600 mb-8">Please log in to start chatting</p>
                <button 
                  onClick={handleGoogleLogin}
                  className="px-6 py-3 bg-gray-800 text-white rounded-full hover:bg-gray-900 transition-colors duration-200 flex items-center justify-center text-lg"
                >
                  <Users size={24} className="mr-2" />
                  Login with Google
                </button>
              </div>
            ) : !currentRoom ? (
              <div className="h-full flex flex-col items-center justify-center p-8">
                <h2 className="text-2xl font-extrabold mb-4">Create or Join a Room</h2>
                <p className="text-gray-600 font-bold mb-8">Get started with your chat room</p>
                <div className="flex flex-col items-center w-full max-w-md">
                  <button
                    onClick={generateRoomKey}
                    className=" px-6 py-3 bg-gray-800 text-white rounded-2xl hover:bg-gray-900 transition-colors duration-200 mb-4 flex items-center justify-center text-lg"
                  >
                    <PlusCircle size={24} className="mr-2" />
                    Create New Room
                  </button>
                  <div className="w-full flex items-center mb-4">
                    <input
                      type="text"
                      value={joinRoomKey}
                      onChange={(e) => setJoinRoomKey(e.target.value)}
                      placeholder="Enter room key"
                      className="flex-1 p-3 border border-gray-300 rounded-l-full focus:outline-none focus:ring-2 focus:ring-gray-500"
                    />
                    <button
                      onClick={joinRoom}
                      className="p-3 md:px-6 md:py-3 bg-gray-700 text-white rounded-r-full hover:bg-gray-800 transition-colors duration-200"
                    >
                      Join
                    </button>
                  </div>
                </div>
                {newRoomKey && (
                  <div className="bg-green-100 p-4 rounded-xl mt-8 text-center">
                    <p className="text-green-800 font-semibold">Your new room key: {newRoomKey}</p>
                    <div className="flex justify-center mt-2">
                      <button
                        onClick={copyRoomKey}
                        className="mr-2 px-3 py-1 bg-green-200 text-green-800 rounded-xl text-sm hover:bg-green-300 transition-colors duration-200 flex items-center"
                      >
                        <Copy size={14} className="mr-1" />
                        Copy
                      </button>
                      <button
                        onClick={shareRoomKey}
                        className="px-3 py-1 bg-blue-200 text-blue-800 rounded-xl text-sm hover:bg-blue-300 transition-colors duration-200 flex items-center"
                      >
                        <Share2 size={14} className="mr-1" />
                        Share
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4">
                {messages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`mb-4 flex ${msg.user === (user.displayName || user.email) ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-3/4 p-3 shadow-xl shadow-black/15 rounded-lg ${msg.user === (user.displayName || user.email) ? 'bg-gray-700 text-white' : 'bg-gray-200'}`}>
                      <p className="font-bold text-sm mb-1">{msg.user}</p>
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Message input */}
            {user && currentRoom && (
              <div className="p-4 bg-white border-t">
                <form onSubmit={sendMessage} className="flex items-center">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded-l-full focus:outline-none focus:ring-2 focus:ring-gray-300"
                    placeholder="Type your message..."
                  />
                  <button 
                    type="submit" 
                    className="px-6 py-3 bg-gray-800 text-white rounded-r-full hover:bg-gray-900 transition-colors duration-200 flex items-center justify-center"
                  >
                    <Send size={24} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Username prompt modal */}
      {showUsernamePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Set Your Username</h2>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter username"
            />
            <button
              onClick={handleSetUsername}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors duration-200"
            >
              Set Username
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;