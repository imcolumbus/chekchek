/**
 * ==========================================
 * 모바일 이북 프로그램 : 책책 (ChekChek)
 * 대상: 어머니
 * ==========================================
 * [버전 정보]
 * v1.1.0 (업데이트: AI 기반 자동 책 생성 기능 추가)
 * * [주요 기능 정리]
 * 1. 코어 기능: Firestore 연동, 실시간 책 목록 불러오기, 진행률 및 마지막 읽은 위치 자동 저장.
 * 2. 시력 보호 및 편의: 다크모드/라이트모드 자동 및 수동 전환, 글자 크기 4단계 조절, 명조/고딕 폰트 변경.
 * 3. 오디오북 (TTS): 웹 음성 API를 활용한 책 읽어주기 기능.
 * 4. 감성 기능: 시간대별 인사말, 문단 스크랩(보관함), 독서 꽃 키우기(성취감).
 * 5. 관리자 기능: 인사말 5회 연속 터치 시 Admin 진입 (비밀번호: 1234). 
 * - [NEW] 주제 키워드만 입력하면 AI가 따뜻한 스토리와 표지 이미지를 자동으로 생성하여 채워주는 기능 추가.
 * 6. UI/UX: 직관적이고 큼직한 버튼, 부드러운 스크롤, 고급스러운 테마.
 * ==========================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Settings, Moon, Sun, Volume2, VolumeX, 
  ArrowLeft, Heart, Flower2, Plus, Lock, Home, 
  Bookmark, Check, ChevronRight, Type, Sparkles
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot, addDoc, deleteDoc 
} from 'firebase/firestore';

// --- Firebase 초기화 (제공된 환경 변수 사용, 실제 배포시 자신의 Config로 변경) ---
const firebaseConfig = {
  apiKey: "AIzaSyAB0wKFTZ640iv5IcDAOLph7mNCtEYUU1I",
  authDomain: "momsbookgarden.firebaseapp.com",
  projectId: "momsbookgarden",
  storageBucket: "momsbookgarden.firebasestorage.app",
  messagingSenderId: "651374929728",
  appId: "1:651374929728:web:57d1c93033e57e4577bca5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'chekchek-app';

// --- 기본 제공 목업 데이터 ---
const MOCK_BOOKS = [
  {
    id: 'mock1',
    title: "따뜻한 봄날의 산책",
    author: "김작가",
    coverUrl: "https://images.unsplash.com/photo-1490750967868-88cb44cb2754?auto=format&fit=crop&q=80&w=400",
    content: "봄바람이 살랑이는 오후입니다.\n\n오랜만에 나선 산책길에는 연분홍 벚꽃이 눈처럼 내리고 있었습니다. 길가에 피어난 작은 들꽃들도 저마다의 색으로 봄을 노래하고 있었죠.\n\n어머니, 오늘 하루는 어떠셨나요?\n가끔은 이렇게 멈춰 서서 계절의 변화를 느끼는 것만으로도 마음이 한결 가벼워진답니다.\n\n햇살이 참 따뜻합니다. 이 따뜻함이 어머니의 마음속까지 전해지기를 바랍니다. 사랑합니다."
  },
  {
    id: 'mock2',
    title: "마음을 편안하게 해주는 시",
    author: "박시인",
    coverUrl: "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&q=80&w=400",
    content: "비가 내리는 날엔 따뜻한 차 한 잔을 끓입니다.\n\n창문을 두드리는 빗소리를 들으며, 지난 추억들을 하나씩 꺼내어 봅니다. 바쁘게만 살아왔던 시간들 속에서 놓치고 지나갔던 작은 행복들이 이제야 보입니다.\n\n모든 것이 완벽하지 않아도 괜찮습니다. 지금 이 순간, 평안함을 느낄 수 있다면 그것으로 충분하니까요.\n\n오늘 밤은 편안히 주무시길 바랍니다."
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('home'); 
  const [books, setBooks] = useState([]);
  const [activeBook, setActiveBook] = useState(null);
  
  const [progressData, setProgressData] = useState({});
  const [scraps, setScraps] = useState([]);
  const [flowerLevel, setFlowerLevel] = useState(0);
  
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [settings, setSettings] = useState({
    theme: prefersDark ? 'dark' : 'light',
    fontSize: 'text-xl', 
    fontFamily: 'font-serif' 
  });

  const [adminClickCount, setAdminClickCount] = useState(0);
  const [toastMsg, setToastMsg] = useState('');

  // --- Firebase 인증 및 데이터 동기화 ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const booksRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
    const unsubscribeBooks = onSnapshot(booksRef, (snapshot) => {
      const bookList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBooks(bookList.length > 0 ? bookList : MOCK_BOOKS);
    }, (error) => console.error("Books fetch error:", error));

    const progressRef = collection(db, 'artifacts', appId, 'users', user.uid, 'progress');
    const unsubscribeProgress = onSnapshot(progressRef, (snapshot) => {
      const pData = {};
      snapshot.docs.forEach(doc => { pData[doc.id] = doc.data(); });
      setProgressData(pData);
      
      const completed = Object.values(pData).filter(p => p.percent >= 95).length;
      setFlowerLevel(completed);
    });

    const scrapsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'scraps');
    const unsubscribeScraps = onSnapshot(scrapsRef, (snapshot) => {
      setScraps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeBooks();
      unsubscribeProgress();
      unsubscribeScraps();
    };
  }, [user]);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return "어머니, 상쾌한 아침이에요. ☀️";
    if (hour >= 11 && hour < 17) return "나른한 오후, 차 한 잔과 함께 책은 어떠세요? ☕";
    if (hour >= 17 && hour < 21) return "오늘 하루도 수고 많으셨어요. 편안한 저녁 되세요. 🌙";
    return "깊은 밤이네요. 눈이 편안한 이야기들을 읽어보세요. 🌟";
  };

  const handleAdminTrigger = () => {
    setAdminClickCount(prev => prev + 1);
    if (adminClickCount >= 4) {
      const pwd = window.prompt("관리자 비밀번호를 입력하세요 (기본: 1234):");
      if (pwd === "1234") {
        setCurrentView('admin');
        setAdminClickCount(0);
      } else {
        setAdminClickCount(0);
      }
    }
  };

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 ${settings.theme === 'dark' ? 'bg-gray-900 text-gray-200' : 'bg-[#FAFAF5] text-stone-800'}`}>
      
      {toastMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-stone-800 text-white px-6 py-3 rounded-full shadow-lg font-medium text-sm transition-opacity">
          {toastMsg}
        </div>
      )}

      {currentView === 'home' && (
        <HomeView 
          books={books} 
          progressData={progressData}
          flowerLevel={flowerLevel}
          getGreeting={getGreeting}
          handleAdminTrigger={handleAdminTrigger}
          onOpenBook={(book) => { setActiveBook(book); setCurrentView('reader'); }}
          onGoScrapbook={() => setCurrentView('scrapbook')}
          theme={settings.theme}
        />
      )}

      {currentView === 'reader' && activeBook && (
        <ReaderView 
          book={activeBook}
          user={user}
          appId={appId}
          settings={settings}
          updateSetting={updateSetting}
          initialProgress={progressData[activeBook.id]}
          onClose={() => { setActiveBook(null); setCurrentView('home'); }}
          showToast={showToast}
        />
      )}

      {currentView === 'scrapbook' && (
        <ScrapbookView 
          scraps={scraps}
          user={user}
          appId={appId}
          onClose={() => setCurrentView('home')}
          theme={settings.theme}
        />
      )}

      {currentView === 'admin' && (
        <AdminView 
          appId={appId}
          onClose={() => setCurrentView('home')}
          showToast={showToast}
          theme={settings.theme}
        />
      )}
    </div>
  );
}

// ==========================================
// 1. 메인 홈 화면 (HomeView)
// ==========================================
function HomeView({ books, progressData, flowerLevel, getGreeting, handleAdminTrigger, onOpenBook, onGoScrapbook, theme }) {
  const getFlowerDisplay = (level) => {
    if (level === 0) return { icon: "🌱", text: "새싹이 돋았어요. 책을 읽어 키워주세요." };
    if (level === 1) return { icon: "🌿", text: "잎사귀가 무성해지고 있어요!" };
    if (level === 2) return { icon: "🪴", text: "화분에 예쁘게 자리 잡았네요." };
    if (level >= 3) return { icon: "🌸", text: "활짝 핀 꽃처럼 아름다운 하루 되세요!" };
  };

  const flowerInfo = getFlowerDisplay(flowerLevel);
  const isDark = theme === 'dark';

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      <header className="pt-12 pb-6 px-6">
        <h1 
          className="text-2xl font-bold font-serif leading-relaxed"
          onClick={handleAdminTrigger}
        >
          {getGreeting()}
        </h1>
        
        <div className={`mt-6 p-5 rounded-2xl flex items-center space-x-4 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="text-4xl bg-stone-100 dark:bg-gray-700 p-3 rounded-full">
            {flowerInfo.icon}
          </div>
          <div>
            <p className="text-sm font-medium opacity-60 mb-1">나의 독서 정원</p>
            <p className="font-semibold">{flowerInfo.text}</p>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-6">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold font-serif">어머니를 위한 추천 글</h2>
          <button onClick={onGoScrapbook} className="flex items-center text-sm font-medium text-amber-600 dark:text-amber-400">
            <Heart size={16} className="mr-1" />
            내 보관함
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {books.map((book) => {
            const progress = progressData[book.id]?.percent || 0;
            return (
              <div 
                key={book.id} 
                onClick={() => onOpenBook(book)}
                className={`rounded-2xl overflow-hidden shadow-sm active:scale-95 transition-transform ${isDark ? 'bg-gray-800' : 'bg-white'}`}
              >
                <div className="aspect-[3/4] w-full bg-gray-200 relative">
                  <img 
                    src={book.coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400'} 
                    alt="표지" 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400'; }}
                  />
                  {progress > 0 && progress < 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300">
                      <div className="h-full bg-amber-500" style={{ width: `${progress}%` }}></div>
                    </div>
                  )}
                  {progress >= 100 && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow">
                      <Check size={16} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold font-serif truncate">{book.title}</h3>
                  <p className="text-sm opacity-60 mt-1">{book.author}</p>
                  {progress > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                      {progress >= 100 ? '다 읽음' : `${Math.round(progress)}% 읽음`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// 2. 책 읽기 화면 (ReaderView)
// ==========================================
function ReaderView({ book, user, appId, settings, updateSetting, initialProgress, onClose, showToast }) {
  const contentRef = useRef(null);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedParagraph, setSelectedParagraph] = useState(null);

  useEffect(() => {
    if (!user) return;
    
    let timeoutId;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!contentRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        const percent = Math.min(100, Math.max(0, (scrollTop / (scrollHeight - clientHeight)) * 100)) || 0;
        
        const progressRef = doc(db, 'artifacts', appId, 'users', user.uid, 'progress', book.id);
        setDoc(progressRef, { 
          percent, 
          scrollTop,
          lastRead: new Date().toISOString() 
        }, { merge: true });
      }, 1000); 
    };

    const el = contentRef.current;
    if (el) el.addEventListener('scroll', handleScroll);
    return () => {
      if (el) el.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [user, appId, book.id]);

  useEffect(() => {
    if (initialProgress?.scrollTop && contentRef.current) {
      setTimeout(() => {
        contentRef.current.scrollTop = initialProgress.scrollTop;
      }, 100);
    }
  }, []);

  const toggleTTS = () => {
    if (!('speechSynthesis' in window)) {
      showToast("이 기기에서는 소리내어 읽기 기능을 지원하지 않습니다.");
      return;
    }

    if (isPlayingTTS) {
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(book.content);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.85; 
      
      utterance.onend = () => setIsPlayingTTS(false);
      utterance.onerror = () => {
        setIsPlayingTTS(false);
        showToast("음성 재생 중 오류가 발생했습니다.");
      };

      window.speechSynthesis.speak(utterance);
      setIsPlayingTTS(true);
    }
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleScrap = async (text) => {
    if (!user) return;
    try {
      const scrapsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'scraps');
      await addDoc(scrapsRef, {
        bookId: book.id,
        bookTitle: book.title,
        text: text,
        createdAt: new Date().toISOString()
      });
      showToast("❤️ 보관함에 예쁘게 저장했어요.");
      setSelectedParagraph(null);
    } catch (error) {
      showToast("저장에 실패했어요.");
    }
  };

  const isDark = settings.theme === 'dark';

  return (
    <div className="fixed inset-0 flex flex-col z-10 bg-inherit">
      <header className={`flex items-center justify-between p-4 shadow-sm z-20 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-[#FAFAF5] border-stone-200'} border-b`}>
        <button onClick={onClose} className="p-2 rounded-full active:bg-gray-200 dark:active:bg-gray-800">
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-bold font-serif truncate px-4 flex-1 text-center">{book.title}</h2>
        <div className="flex space-x-2">
          <button onClick={toggleTTS} className={`p-2 rounded-full ${isPlayingTTS ? 'text-amber-500' : ''} active:bg-gray-200 dark:active:bg-gray-800`}>
            {isPlayingTTS ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-full active:bg-gray-200 dark:active:bg-gray-800">
            <Settings size={24} />
          </button>
        </div>
      </header>

      {showSettings && (
        <div className={`absolute top-16 right-4 p-4 rounded-2xl shadow-xl z-30 w-72 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-stone-100'}`}>
          <div className="space-y-6">
            <div>
              <p className="text-sm font-bold mb-3 flex items-center"><Type size={16} className="mr-1"/> 글자 크기</p>
              <div className="flex justify-between space-x-2">
                {['text-lg', 'text-xl', 'text-2xl', 'text-3xl'].map((size, i) => (
                  <button 
                    key={size}
                    onClick={() => updateSetting('fontSize', size)}
                    className={`flex-1 py-2 rounded-xl border ${settings.fontSize === size ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900 dark:border-amber-700 dark:text-amber-100' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    가{i === 0 ? ' (작게)' : i === 3 ? ' (아주크게)' : ''}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold mb-3 flex items-center"><BookOpen size={16} className="mr-1"/> 글꼴 (모양)</p>
              <div className="flex space-x-2">
                <button 
                  onClick={() => updateSetting('fontFamily', 'font-serif')}
                  className={`flex-1 py-2 rounded-xl font-serif border ${settings.fontFamily === 'font-serif' ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900 dark:border-amber-700 dark:text-amber-100' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  명조체
                </button>
                <button 
                  onClick={() => updateSetting('fontFamily', 'font-sans')}
                  className={`flex-1 py-2 rounded-xl font-sans border ${settings.fontFamily === 'font-sans' ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900 dark:border-amber-700 dark:text-amber-100' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  고딕체
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold mb-3 flex items-center"><Sun size={16} className="mr-1"/> 배경 색상</p>
              <div className="flex space-x-2">
                <button 
                  onClick={() => updateSetting('theme', 'light')}
                  className={`flex-1 flex justify-center py-2 rounded-xl border ${settings.theme === 'light' ? 'bg-amber-100 border-amber-300 text-amber-800' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  <Sun size={20} /> <span className="ml-2">낮 (밝게)</span>
                </button>
                <button 
                  onClick={() => updateSetting('theme', 'dark')}
                  className={`flex-1 flex justify-center py-2 rounded-xl border ${settings.theme === 'dark' ? 'bg-amber-900 border-amber-700 text-amber-100' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  <Moon size={20} /> <span className="ml-2">밤 (어둡게)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto px-6 py-8 relative scroll-smooth"
        onClick={() => setShowSettings(false)}
      >
        <div className={`max-w-2xl mx-auto ${settings.fontSize} ${settings.fontFamily} leading-[2.0] tracking-wide`}>
          {book.content.split('\n').map((paragraph, index) => {
            if (!paragraph.trim()) return <br key={index} />;
            const isSelected = selectedParagraph === index;
            return (
              <div key={index} className="relative mb-6">
                <p 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedParagraph(isSelected ? null : index);
                  }}
                  className={`cursor-pointer transition-colors p-2 rounded-lg -mx-2 ${isSelected ? (isDark ? 'bg-gray-800' : 'bg-amber-50') : ''}`}
                >
                  {paragraph}
                </p>
                
                {isSelected && (
                  <div className="absolute top-full left-0 mt-2 z-10 flex space-x-2 animate-fade-in-up">
                    <button 
                      onClick={() => handleScrap(paragraph)}
                      className="bg-stone-800 text-white dark:bg-amber-500 dark:text-stone-900 px-4 py-2 rounded-full shadow-lg flex items-center text-sm font-bold"
                    >
                      <Bookmark size={16} className="mr-1" /> 이 문장 간직하기
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          
          <div className="py-20 text-center opacity-50 text-base font-sans flex flex-col items-center">
            <Sparkles size={24} className="mb-2" />
            <p>마지막 페이지입니다.</p>
            <p>끝까지 읽으신 어머니, 최고예요!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. 보관함 화면 (ScrapbookView)
// ==========================================
function ScrapbookView({ scraps, user, appId, onClose, theme }) {
  const isDark = theme === 'dark';

  const handleDelete = async (id) => {
    if(window.confirm("이 문장을 보관함에서 지울까요?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'scraps', id));
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col">
      <header className="flex items-center p-4">
        <button onClick={onClose} className="p-2 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-bold font-serif text-xl ml-2 flex-1">내 마음 보관함</h2>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-20 space-y-4">
        {scraps.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50 mt-20">
            <Bookmark size={48} className="mb-4" />
            <p>아직 간직한 문장이 없어요.</p>
            <p className="text-sm mt-2">책을 읽다가 마음에 드는 글귀를 눌러보세요.</p>
          </div>
        ) : (
          scraps.map(scrap => (
            <div key={scrap.id} className={`p-5 rounded-2xl shadow-sm relative ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <button 
                onClick={() => handleDelete(scrap.id)}
                className="absolute top-4 right-4 opacity-40 hover:opacity-100"
              >
                ✕
              </button>
              <Heart size={20} className="text-amber-500 mb-3" fill="currentColor" />
              <p className="font-serif text-lg leading-relaxed mb-4">{scrap.text}</p>
              <p className="text-sm opacity-60 text-right">- {scrap.bookTitle} 중에서</p>
            </div>
          ))
        )}
      </main>
    </div>
  );
}

// ==========================================
// 4. 관리자 화면 (AdminView) - AI 자동 생성 및 추가
// ==========================================
function AdminView({ appId, onClose, showToast, theme }) {
  const [keyword, setKeyword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI 자동 생성 로직 (Gemini API & 이미지 오픈 API 활용)
  const handleAutoGenerate = async () => {
    if (!keyword) {
      showToast("생성할 주제를 입력해주세요 (예: 봄, 가족)");
      return;
    }
    setIsGenerating(true);
    showToast("AI가 어머니를 위한 글을 짓고 있습니다... (약 10초 소요)");

    try {
      const apiKey = ""; // 실행 환경에서 런타임에 주입됨
      const prompt = `어머니가 핸드폰으로 읽기 좋은 따뜻하고 긍정적인 내용의 짧은 에세이 또는 이야기를 한국어로 작성해줘.
      주제 키워드: ${keyword}
      응답은 반드시 아래 JSON 형식으로만 반환해 (다른 말은 하지 마).
      {
        "title": "책 제목 (한국어)",
        "content": "본문 내용 (한국어, 문단 구분을 위해 \\n\\n 사용. 1~2분 정도 읽을 분량)",
        "imagePrompt": "표지에 어울리는 따뜻한 분위기의 아름다운 그림 프롬프트 (반드시 영어로 작성, 예: A warm watercolor painting of a spring garden with blooming flowers)"
      }`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("텍스트 생성 실패");

      const result = JSON.parse(text);
      setTitle(result.title);
      setContent(result.content);
      setAuthor("따뜻한 AI 작가");
      
      // Pollinations AI의 무료 오픈 엔드포인트를 사용하여 프롬프트 기반 이미지 URL 자동 매핑
      const generatedImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(result.imagePrompt)}?width=400&height=600&nologo=true`;
      setCoverUrl(generatedImageUrl);
      
      showToast("✨ AI가 책 초안과 표지를 완성했습니다! 확인 후 저장해주세요.");
    } catch (error) {
      console.error(error);
      showToast("자동 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      showToast("제목과 내용은 필수입니다.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const booksRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
      await addDoc(booksRef, {
        title,
        author: author || '작자 미상',
        coverUrl: coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
        content,
        createdAt: new Date().toISOString()
      });
      showToast("새 책이 성공적으로 등록되었습니다!");
      setTitle(''); setAuthor(''); setCoverUrl(''); setContent('');
      onClose(); // 성공 후 홈으로
    } catch (error) {
      console.error(error);
      showToast("등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = theme === 'dark';
  const inputClass = `w-full p-3 rounded-xl mb-4 border ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-amber-500 outline-none`;

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4 bg-stone-800 text-white">
        <div className="flex items-center">
          <Lock size={20} className="mr-2" />
          <h2 className="font-bold">관리자 페이지 (책 등록)</h2>
        </div>
        <button onClick={onClose} className="p-2">
          닫기
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        
        {/* AI 자동 생성 영역 */}
        <div className={`p-4 rounded-xl mb-6 border ${isDark ? 'bg-gray-800 border-amber-900' : 'bg-amber-50 border-amber-200'}`}>
          <h3 className="font-bold mb-2 flex items-center text-amber-600 dark:text-amber-400">
            <Sparkles size={18} className="mr-1" /> AI 자동 책 작성기
          </h3>
          <p className="text-xs opacity-70 mb-3 leading-relaxed">
            원하시는 주제(예: 봄, 가족, 여행)를 입력하면, 어머니가 읽기 좋은 따뜻한 이야기와 멋진 표지가 자동으로 완성됩니다.
          </p>
          <div className="flex space-x-2">
            <input 
              type="text" 
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="주제를 입력하세요" 
              className={`flex-1 p-3 rounded-xl border ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'} outline-none`}
            />
            <button 
              onClick={handleAutoGenerate}
              disabled={isGenerating || !keyword}
              className="bg-stone-800 dark:bg-amber-600 text-white px-4 rounded-xl font-bold disabled:opacity-50 whitespace-nowrap"
            >
              {isGenerating ? '작성 중...' : '자동 생성'}
            </button>
          </div>
        </div>

        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
          <span className="px-3 text-sm opacity-50 font-bold">생성된 내용 확인 및 직접 편집</span>
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-bold mb-1">책 제목</label>
          <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="예: 긍정의 한 줄" 
            className={inputClass}
          />

          <label className="block text-sm font-bold mb-1">지은이</label>
          <input 
            type="text" 
            value={author} 
            onChange={e => setAuthor(e.target.value)} 
            placeholder="예: 김철수" 
            className={inputClass}
          />

          <label className="block text-sm font-bold mb-1">표지 이미지 주소 (URL)</label>
          <input 
            type="text" 
            value={coverUrl} 
            onChange={e => setCoverUrl(e.target.value)} 
            placeholder="https://... (자동 생성 시 채워집니다)" 
            className={inputClass}
          />

          <label className="block text-sm font-bold mb-1">책 내용 (본문)</label>
          <textarea 
            value={content} 
            onChange={e => setContent(e.target.value)} 
            placeholder="본문 내용을 입력하세요. 엔터를 치면 문단이 나뉩니다." 
            className={`${inputClass} h-64 resize-none leading-relaxed`}
          ></textarea>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-amber-600 text-white font-bold text-lg py-4 rounded-xl shadow hover:bg-amber-700 disabled:opacity-50 mt-2"
          >
            {isSubmitting ? '저장 중...' : '어머니 책장에 등록하기'}
          </button>
        </form>
      </main>
    </div>
  );
}
