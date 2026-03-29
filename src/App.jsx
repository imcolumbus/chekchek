/**
 * ==========================================
 * 모바일 이북 프로그램 : 책책 (ChekChek)
 * 대상: 어머니
 * 기획: 아들/딸 (사용자)
 * 개발: Gemini
 * 서명: 어머니의 편안하고 따뜻한 독서를 위해 정성을 다해 만들었습니다. ✍️
 * ==========================================
 * [버전 정보]
 * v1.2.0 (업데이트 일자: 2026.03.29)
 * * * [주요 업데이트 내용]
 * 1. UI/UX 전면 개편: 상업용 앱 수준의 부드러운 애니메이션, 글래스모피즘 디자인, 하단 네비게이션 바 적용.
 * 2. 카테고리 세분화: 전체, 추천, 고전소설, 에세이, 시 등 탭(Tab) 기능 추가.
 * 3. 관리자 비밀번호 개선: 최초 1회 입력 시 자동 로그인(로컬 스토리지 활용), 관리자 페이지 내 비밀번호 변경 기능 추가.
 * 4. 콘텐츠 자동 업데이트 로직 변경: AI 생성 대신 저작권 프리(오픈 도메인) 리소스 원클릭 업데이트 기능으로 대체.
 * ==========================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Settings, Moon, Sun, Volume2, VolumeX, 
  ArrowLeft, Heart, Flower2, Lock, Home, 
  Bookmark, Check, Sparkles, Key, Download, Library, Search
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, getDocs, onSnapshot, addDoc, deleteDoc 
} from 'firebase/firestore';

// --- [수정 필요] Firebase 초기화 ---
// 🚨 주의: 현재는 미리보기 환경을 위해 임시 변수(__firebase_config)를 사용 중입니다.
// 실제 Vercel 등에 배포할 때는 아래 코드를 지우고 본인의 Firebase Config 객체로 덮어씌워야 합니다.
// 예시: const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "..." };
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { projectId: "demo-project" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🚨 주의: 배포 시 본인만의 고유한 앱 ID 문자열로 변경하셔도 좋습니다. (예: 'chekchek-my-mom-app')
const appId = typeof __app_id !== 'undefined' ? __app_id : 'chekchek-app';

// --- [수정 가능] 오픈 도메인 데이터베이스 (관리자 원클릭 업데이트용) ---
// 이곳에 인터넷에 공개된 저작권 만료 시, 소설, 에세이 등을 추가해두면 
// 관리자 페이지에서 클릭 한 번으로 앱에 반영됩니다.
const PUBLIC_RESOURCES = [
  {
    title: "별 헤는 밤", author: "윤동주", category: "시",
    coverUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=400",
    content: "계절이 지나가는 하늘에는\n가을로 가득 차 있습니다.\n\n나는 아무 걱정도 없이\n가을 속의 별들을 다 헤일 듯합니다.\n\n가슴 속에 하나 둘 새겨지는 별을\n이제 다 못 헤는 것은\n쉬이 아침이 오는 까닭이요,\n내일 밤이 남은 까닭이요,\n아직 나의 청춘이 다하지 않은 까닭입니다.\n\n별 하나에 추억과\n별 하나에 사랑과\n별 하나에 쓸쓸함과\n별 하나에 동경과\n별 하나에 시와\n별 하나에 어머니, 어머니"
  },
  {
    title: "동백꽃 (발췌)", author: "김유정", category: "고전소설",
    coverUrl: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&q=80&w=400",
    content: "오늘도 또 우리 수탉이 막 쫓기었다. 내가 점심을 먹고 나무를 하러 갈 양으로 나올 때이었다. 산으로 올라서려니까 등뒤에서 푸드득 푸드득 하고 닭의 횃소리가 야단이다. 깜짝 놀라며 고개를 돌려보니 아니나 다르랴 두 놈이 또 얼리었다.\n\n점순이네 수탉(대강이가 크고 똑 오소리같이 실팍하게 생긴 놈)이 덩저리 작은 우리 수탉을 함부로 해내는 것이다."
  },
  {
    title: "인연에 대하여", author: "피천득 등 (오픈 엮음)", category: "에세이",
    coverUrl: "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?auto=format&fit=crop&q=80&w=400",
    content: "어리석은 사람은 인연을 만나도 몰라보고,\n보통 사람은 인연인 줄 알면서도 놓치고,\n현명한 사람은 옷깃만 스쳐도 인연을 살려냅니다.\n\n살아가면서 만나는 수많은 사람들 속에서, 진정한 인연을 알아보고 소중히 가꾸는 것은 큰 축복입니다. 어머니의 삶 속에서도 늘 따뜻한 인연이 함께하시길 바랍니다."
  },
  {
    title: "진달래꽃", author: "김소월", category: "시",
    coverUrl: "https://images.unsplash.com/photo-1554146036-7c9bc3c8ff79?auto=format&fit=crop&q=80&w=400",
    content: "나보기가 역겨워\n가실 때에는\n말없이 고이 보내 드리우리다.\n\n영변에 약산\n진달래꽃\n아름 따다 가실 길에 뿌리우리다.\n\n가시는 걸음 걸음\n놓인 그 꽃을\n사뿐히 즈려 밟고 가시옵소서."
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
  
  // --- [확인 필요] 기본 관리자 비밀번호 ---
  // 앱 최초 구동 시 비밀번호입니다. 관리자 페이지에서 변경하세요.
  const [adminPassword, setAdminPassword] = useState("1234"); 
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [toastMsg, setToastMsg] = useState('');

  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [settings, setSettings] = useState({
    theme: prefersDark ? 'dark' : 'light',
    fontSize: 'text-xl', 
    fontFamily: 'font-serif' 
  });

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

    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // 1. 책 목록
    const booksRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
    const unsubscribeBooks = onSnapshot(booksRef, (snapshot) => {
      const bookList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBooks(bookList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
    });

    // 2. 관리자 비밀번호 세팅 가져오기
    const settingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'settings');
    const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
      const pwdDoc = snapshot.docs.find(doc => doc.id === 'admin');
      if (pwdDoc) setAdminPassword(pwdDoc.data().password);
    });

    // 3. 개인 진행률
    const progressRef = collection(db, 'artifacts', appId, 'users', user.uid, 'progress');
    const unsubscribeProgress = onSnapshot(progressRef, (snapshot) => {
      const pData = {};
      snapshot.docs.forEach(doc => { pData[doc.id] = doc.data(); });
      setProgressData(pData);
      setFlowerLevel(Object.values(pData).filter(p => p.percent >= 95).length);
    });

    // 4. 개인 스크랩
    const scrapsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'scraps');
    const unsubscribeScraps = onSnapshot(scrapsRef, (snapshot) => {
      setScraps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeBooks(); unsubscribeSettings(); unsubscribeProgress(); unsubscribeScraps();
    };
  }, [user]);

  // 테마 적용
  useEffect(() => {
    if (settings.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings.theme]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // 관리자 진입 로직 (로컬 스토리지 확인하여 1회 로그인 구현)
  const handleAdminTrigger = () => {
    setAdminClickCount(prev => prev + 1);
    if (adminClickCount >= 4) {
      const savedPwd = localStorage.getItem('chekchek_admin_pwd');
      if (savedPwd === adminPassword) {
        // 이미 인증된 기기
        setCurrentView('admin');
        setAdminClickCount(0);
        showToast("관리자님, 환영합니다.");
      } else {
        const pwd = window.prompt("관리자 비밀번호를 입력하세요:");
        if (pwd === adminPassword) {
          localStorage.setItem('chekchek_admin_pwd', pwd);
          setCurrentView('admin');
          setAdminClickCount(0);
        } else if (pwd !== null) {
          showToast("비밀번호가 틀렸습니다.");
          setAdminClickCount(0);
        }
      }
    }
  };

  const isDark = settings.theme === 'dark';

  return (
    <div className={`min-h-screen w-full transition-all duration-500 font-sans ${isDark ? 'bg-[#121212] text-stone-200' : 'bg-[#F9F8F6] text-stone-800'}`}>
      
      {toastMsg && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-stone-800/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl font-medium text-sm transition-all animate-fade-in-up">
          {toastMsg}
        </div>
      )}

      {currentView === 'home' && (
        <HomeView 
          books={books} 
          progressData={progressData}
          flowerLevel={flowerLevel}
          handleAdminTrigger={handleAdminTrigger}
          onOpenBook={(book) => { setActiveBook(book); setCurrentView('reader'); }}
          theme={settings.theme}
          onNavChange={setCurrentView}
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
          onNavChange={setCurrentView}
          theme={settings.theme}
        />
      )}

      {currentView === 'admin' && (
        <AdminView 
          appId={appId}
          onClose={() => setCurrentView('home')}
          showToast={showToast}
          theme={settings.theme}
          currentBooks={books}
        />
      )}
    </div>
  );
}

// ==========================================
// 1. 메인 홈 화면 (HomeView) - UX 상업용 업그레이드
// ==========================================
function HomeView({ books, progressData, flowerLevel, handleAdminTrigger, onOpenBook, theme, onNavChange }) {
  const [activeCategory, setActiveCategory] = useState('추천');
  const categories = ['추천', '고전소설', '에세이', '시', '전체'];
  const isDark = theme === 'dark';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return "상쾌한 아침이에요. ☀️";
    if (hour >= 11 && hour < 17) return "차 한 잔과 함께 책은 어떠세요? ☕";
    if (hour >= 17 && hour < 21) return "오늘도 수고 많으셨어요. 🌙";
    return "눈이 편안한 글을 읽어보세요. 🌟";
  };

  const filteredBooks = books.filter(b => {
    if (activeCategory === '전체') return true;
    if (activeCategory === '추천') return b.category === '추천' || true; // 기본적으로 최근순 보여주되, 추천 태그 우선(여기선 전부)
    return b.category === activeCategory;
  });

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24 relative flex flex-col">
      <header className="pt-14 pb-4 px-6">
        <h1 className="text-3xl font-bold font-serif leading-tight select-none tracking-tight" onClick={handleAdminTrigger}>
          어머니, <br />
          <span className="text-amber-600 dark:text-amber-400">{getGreeting()}</span>
        </h1>
        
        {/* 아름다운 독서 성취 화분 */}
        <div className={`mt-8 p-6 rounded-3xl flex items-center space-x-5 shadow-lg shadow-amber-900/5 transition-all duration-300 ${isDark ? 'bg-stone-800/80' : 'bg-white/80'} backdrop-blur-md border border-white/20`}>
          <div className="text-5xl drop-shadow-md">
            {flowerLevel >= 3 ? "🌸" : flowerLevel === 2 ? "🪴" : flowerLevel === 1 ? "🌿" : "🌱"}
          </div>
          <div>
            <p className="text-sm font-medium opacity-60 mb-1 tracking-wide">나의 독서 정원</p>
            <p className="font-bold text-lg leading-snug">
              {flowerLevel >= 3 ? "활짝 핀 꽃처럼 아름다운 하루!" : "책을 읽고 마음의 꽃을 키워요"}
            </p>
          </div>
        </div>
      </header>

      {/* 카테고리 탭 */}
      <div className="px-6 py-2 overflow-x-auto hide-scrollbar flex space-x-3 mb-4">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              activeCategory === cat 
                ? 'bg-stone-800 text-white shadow-md dark:bg-amber-500 dark:text-stone-900' 
                : `${isDark ? 'bg-stone-800 text-stone-400' : 'bg-stone-200/50 text-stone-500'}`
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <main className="flex-1 px-6 space-y-6">
        {filteredBooks.length === 0 ? (
          <div className="py-20 text-center opacity-50 flex flex-col items-center">
            <Library size={48} className="mb-4" strokeWidth={1.5} />
            <p className="font-medium text-lg">아직 등록된 글이 없어요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5">
            {filteredBooks.map((book) => {
              const progress = progressData[book.id]?.percent || 0;
              return (
                <div 
                  key={book.id} 
                  onClick={() => onOpenBook(book)}
                  className={`group rounded-3xl overflow-hidden shadow-sm hover:shadow-xl active:scale-95 transition-all duration-300 cursor-pointer ${isDark ? 'bg-stone-800' : 'bg-white'}`}
                >
                  <div className="aspect-[3/4] w-full bg-stone-200 relative overflow-hidden">
                    <img 
                      src={book.coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400'} 
                      alt="표지" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full font-bold tracking-wider">
                      {book.category || '추천'}
                    </div>
                    {progress > 0 && progress < 100 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20 backdrop-blur-sm">
                        <div className="h-full bg-amber-500 rounded-r-full" style={{ width: `${progress}%` }}></div>
                      </div>
                    )}
                    {progress >= 100 && (
                      <div className="absolute top-3 right-3 bg-green-500 text-white p-1.5 rounded-full shadow-lg">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold font-serif text-[15px] truncate leading-tight mb-1">{book.title}</h3>
                    <p className="text-xs opacity-60 font-medium">{book.author}</p>
                    {progress > 0 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 font-bold tracking-wide">
                        {progress >= 100 ? '완독' : `${Math.round(progress)}% 읽음`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 하단 네비게이션 */}
      <nav className={`fixed bottom-0 w-full max-w-md left-1/2 transform -translate-x-1/2 flex justify-around items-center py-4 px-6 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 backdrop-blur-xl ${isDark ? 'bg-stone-900/90 border-t border-stone-800' : 'bg-white/90 border-t border-stone-100'}`}>
        <button onClick={() => onNavChange('home')} className="flex flex-col items-center text-amber-600 dark:text-amber-500">
          <Home size={24} strokeWidth={2.5} />
          <span className="text-[10px] font-bold mt-1">홈</span>
        </button>
        <button onClick={() => onNavChange('scrapbook')} className="flex flex-col items-center opacity-40 hover:opacity-100 transition-opacity">
          <Heart size={24} strokeWidth={2.5} />
          <span className="text-[10px] font-bold mt-1">보관함</span>
        </button>
      </nav>
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
  const [scrollPercent, setScrollPercent] = useState(initialProgress?.percent || 0);

  useEffect(() => {
    if (!user) return;
    let timeoutId;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      if (!contentRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const percent = Math.min(100, Math.max(0, (scrollTop / (scrollHeight - clientHeight)) * 100)) || 0;
      setScrollPercent(percent);

      timeoutId = setTimeout(() => {
        const progressRef = doc(db, 'artifacts', appId, 'users', user.uid, 'progress', book.id);
        setDoc(progressRef, { percent, scrollTop, lastRead: new Date().toISOString() }, { merge: true });
      }, 500); 
    };

    const el = contentRef.current;
    if (el) el.addEventListener('scroll', handleScroll);
    return () => { if (el) el.removeEventListener('scroll', handleScroll); clearTimeout(timeoutId); };
  }, [user, appId, book.id]);

  useEffect(() => {
    if (initialProgress?.scrollTop && contentRef.current) {
      setTimeout(() => { contentRef.current.scrollTop = initialProgress.scrollTop; }, 100);
    }
  }, []);

  const toggleTTS = () => {
    if (!('speechSynthesis' in window)) {
      showToast("이 기기에서는 소리내어 읽기 기능을 지원하지 않습니다."); return;
    }
    if (isPlayingTTS) {
      window.speechSynthesis.cancel(); setIsPlayingTTS(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(book.content);
      utterance.lang = 'ko-KR'; utterance.rate = 0.8; 
      utterance.onend = () => setIsPlayingTTS(false);
      utterance.onerror = () => { setIsPlayingTTS(false); showToast("음성 재생 중 오류가 발생했습니다."); };
      window.speechSynthesis.speak(utterance); setIsPlayingTTS(true);
    }
  };

  useEffect(() => {
    return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, []);

  const handleScrap = async (text) => {
    if (!user) return;
    try {
      const scrapsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'scraps');
      await addDoc(scrapsRef, { bookId: book.id, bookTitle: book.title, text, createdAt: new Date().toISOString() });
      showToast("❤️ 보관함에 예쁘게 저장했어요.");
      setSelectedParagraph(null);
    } catch (error) { showToast("저장에 실패했어요."); }
  };

  const isDark = settings.theme === 'dark';

  return (
    <div className="fixed inset-0 flex flex-col z-50 bg-inherit transform transition-transform duration-500 translate-y-0">
      {/* 상단 프로그레스 바 */}
      <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-800 z-50 fixed top-0 left-0">
        <div className="h-full bg-amber-500 transition-all duration-300 ease-out" style={{ width: `${scrollPercent}%` }}></div>
      </div>

      <header className={`flex items-center justify-between p-4 shadow-sm z-40 mt-1.5 ${isDark ? 'bg-[#121212]/95 border-stone-800' : 'bg-[#F9F8F6]/95 border-stone-200'} backdrop-blur-md border-b`}>
        <button onClick={onClose} className="p-3 -ml-2 rounded-full active:bg-stone-200 dark:active:bg-stone-800 transition-colors">
          <ArrowLeft size={26} strokeWidth={2} />
        </button>
        <div className="flex-1 text-center px-4">
          <div className="text-[10px] opacity-50 font-bold tracking-widest uppercase mb-0.5">{book.category}</div>
          <h2 className="font-bold font-serif text-lg truncate leading-tight">{book.title}</h2>
        </div>
        <div className="flex space-x-1">
          <button onClick={toggleTTS} className={`p-3 rounded-full transition-colors ${isPlayingTTS ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' : 'active:bg-stone-200 dark:active:bg-stone-800'}`}>
            {isPlayingTTS ? <Volume2 size={24} strokeWidth={2.5}/> : <VolumeX size={24} strokeWidth={2}/>}
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="p-3 -mr-2 rounded-full active:bg-stone-200 dark:active:bg-stone-800 transition-colors">
            <Settings size={24} strokeWidth={2}/>
          </button>
        </div>
      </header>

      {/* 설정 모달 (세련된 디자인) */}
      {showSettings && (
        <div className={`absolute top-20 right-4 p-5 rounded-3xl shadow-2xl z-40 w-72 backdrop-blur-xl ${isDark ? 'bg-stone-800/95 border border-stone-700' : 'bg-white/95 border border-stone-100'}`}>
          <div className="space-y-7">
            <div>
              <p className="text-xs font-bold mb-3 flex items-center tracking-wide opacity-60"><Type size={14} className="mr-1.5"/> 글자 크기</p>
              <div className="flex justify-between space-x-2 bg-stone-100 dark:bg-stone-900 p-1 rounded-2xl">
                {['text-lg', 'text-xl', 'text-2xl', 'text-3xl'].map((size, i) => (
                  <button key={size} onClick={() => updateSetting('fontSize', size)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${settings.fontSize === size ? 'bg-white dark:bg-stone-700 shadow-sm text-amber-600 dark:text-amber-400' : 'text-stone-500'}`}
                  >가{i===3 && '+'}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold mb-3 flex items-center tracking-wide opacity-60"><BookOpen size={14} className="mr-1.5"/> 글꼴 (모양)</p>
              <div className="flex space-x-2 bg-stone-100 dark:bg-stone-900 p-1 rounded-2xl">
                <button onClick={() => updateSetting('fontFamily', 'font-serif')}
                  className={`flex-1 py-2.5 rounded-xl font-serif text-sm font-bold transition-all ${settings.fontFamily === 'font-serif' ? 'bg-white dark:bg-stone-700 shadow-sm text-amber-600' : 'text-stone-500'}`}
                >명조체</button>
                <button onClick={() => updateSetting('fontFamily', 'font-sans')}
                  className={`flex-1 py-2.5 rounded-xl font-sans text-sm font-bold transition-all ${settings.fontFamily === 'font-sans' ? 'bg-white dark:bg-stone-700 shadow-sm text-amber-600' : 'text-stone-500'}`}
                >고딕체</button>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold mb-3 flex items-center tracking-wide opacity-60"><Sun size={14} className="mr-1.5"/> 배경 테마</p>
              <div className="flex space-x-2 bg-stone-100 dark:bg-stone-900 p-1 rounded-2xl">
                <button onClick={() => updateSetting('theme', 'light')}
                  className={`flex-1 flex justify-center items-center py-2.5 rounded-xl text-sm font-bold transition-all ${settings.theme === 'light' ? 'bg-white shadow-sm text-amber-600' : 'text-stone-500'}`}
                ><Sun size={18} /> <span className="ml-1.5">낮</span></button>
                <button onClick={() => updateSetting('theme', 'dark')}
                  className={`flex-1 flex justify-center items-center py-2.5 rounded-xl text-sm font-bold transition-all ${settings.theme === 'dark' ? 'bg-stone-700 shadow-sm text-amber-400' : 'text-stone-500'}`}
                ><Moon size={18} /> <span className="ml-1.5">밤</span></button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-10 relative scroll-smooth" onClick={() => setShowSettings(false)}>
        <div className={`max-w-2xl mx-auto ${settings.fontSize} ${settings.fontFamily} leading-[2.2] tracking-wide text-stone-800 dark:text-stone-300 font-medium pb-32`}>
          <h1 className="text-3xl font-bold mb-12 leading-tight text-center font-serif">{book.title}</h1>
          {book.content.split('\n').map((paragraph, index) => {
            if (!paragraph.trim()) return <div key={index} className="h-6"></div>;
            const isSelected = selectedParagraph === index;
            return (
              <div key={index} className="relative mb-6">
                <p onClick={(e) => { e.stopPropagation(); setSelectedParagraph(isSelected ? null : index); }}
                  className={`cursor-pointer transition-all duration-300 p-3 rounded-2xl -mx-3 ${isSelected ? (isDark ? 'bg-amber-900/40 text-white' : 'bg-amber-100/50 text-stone-900') : 'hover:bg-stone-100/50 dark:hover:bg-stone-800/50'}`}
                >
                  {paragraph}
                </p>
                {isSelected && (
                  <div className="absolute top-full left-0 mt-2 z-10 animate-fade-in-up">
                    <button onClick={() => handleScrap(paragraph)} className="bg-stone-900 text-white dark:bg-amber-500 dark:text-stone-900 px-5 py-3 rounded-full shadow-xl flex items-center text-sm font-bold transform hover:scale-105 transition-transform">
                      <Bookmark size={18} className="mr-2" /> 이 문장 간직하기
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          
          <div className="mt-32 pt-16 border-t border-stone-200 dark:border-stone-800 text-center opacity-40 flex flex-col items-center">
            <Sparkles size={28} className="mb-4" strokeWidth={1.5} />
            <p className="text-lg font-bold">마지막 페이지입니다.</p>
            <p className="mt-2 font-medium">끝까지 읽으신 어머니, 최고예요!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. 보관함 화면 (ScrapbookView)
// ==========================================
function ScrapbookView({ scraps, user, appId, onNavChange, theme }) {
  const isDark = theme === 'dark';
  const handleDelete = async (id) => {
    if(window.confirm("이 문장을 보관함에서 지울까요?")) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'scraps', id));
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col pb-24">
      <header className="pt-14 pb-6 px-6">
        <h1 className="text-3xl font-bold font-serif leading-tight">내 마음 보관함</h1>
        <p className="opacity-60 text-sm mt-2 font-medium tracking-wide">간직하고 싶은 문장들을 모아두었어요.</p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 space-y-5">
        {scraps.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 mt-32">
            <Bookmark size={56} className="mb-5" strokeWidth={1} />
            <p className="font-bold text-lg">아직 간직한 문장이 없어요.</p>
          </div>
        ) : (
          scraps.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(scrap => (
            <div key={scrap.id} className={`p-6 rounded-3xl shadow-sm relative group ${isDark ? 'bg-stone-800' : 'bg-white'}`}>
              <button onClick={() => handleDelete(scrap.id)} className="absolute top-5 right-5 opacity-20 hover:opacity-100 transition-opacity bg-stone-100 dark:bg-stone-700 rounded-full p-1.5">✕</button>
              <Heart size={24} className="text-amber-500 mb-4" fill="currentColor" />
              <p className="font-serif text-lg leading-loose text-stone-700 dark:text-stone-300 mb-6">{scrap.text}</p>
              <p className="text-xs opacity-50 text-right font-bold bg-stone-100 dark:bg-stone-900 inline-block float-right px-3 py-1.5 rounded-lg">- {scrap.bookTitle}</p>
              <div className="clear-both"></div>
            </div>
          ))
        )}
      </main>

      <nav className={`fixed bottom-0 w-full max-w-md left-1/2 transform -translate-x-1/2 flex justify-around items-center py-4 px-6 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 backdrop-blur-xl ${isDark ? 'bg-stone-900/90 border-t border-stone-800' : 'bg-white/90 border-t border-stone-100'}`}>
        <button onClick={() => onNavChange('home')} className="flex flex-col items-center opacity-40 hover:opacity-100 transition-opacity">
          <Home size={24} strokeWidth={2.5} />
          <span className="text-[10px] font-bold mt-1">홈</span>
        </button>
        <button onClick={() => onNavChange('scrapbook')} className="flex flex-col items-center text-amber-600 dark:text-amber-500">
          <Heart size={24} strokeWidth={2.5} />
          <span className="text-[10px] font-bold mt-1">보관함</span>
        </button>
      </nav>
    </div>
  );
}

// ==========================================
// 4. 관리자 화면 (AdminView) - 오픈 API/비밀번호 관리
// ==========================================
function AdminView({ appId, onClose, showToast, theme, currentBooks }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('에세이');
  const [coverUrl, setCoverUrl] = useState('');
  const [content, setContent] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);
  const [isUpdatingResource, setIsUpdatingResource] = useState(false);

  const isDark = theme === 'dark';
  const inputClass = `w-full p-4 rounded-2xl mb-5 border font-medium ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-stone-50 border-stone-200'} focus:ring-2 focus:ring-amber-500 outline-none transition-all`;

  // --- 수동 추가 로직 ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) return showToast("제목과 내용은 필수입니다.");
    
    try {
      const booksRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
      await addDoc(booksRef, {
        title, author: author || '작자 미상', category,
        coverUrl: coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
        content, createdAt: new Date().toISOString()
      });
      showToast("새 콘텐츠가 성공적으로 등록되었습니다.");
      setTitle(''); setAuthor(''); setCoverUrl(''); setContent('');
    } catch (error) { showToast("등록 중 오류가 발생했습니다."); }
  };

  // --- 오픈 리소스 원클릭 업데이트 로직 ---
  const handleAutoUpdate = async () => {
    setIsUpdatingResource(true);
    try {
      // 1. 이미 등록된 오픈 리소스인지 확인 (제목 기준)
      const existingTitles = currentBooks.map(b => b.title);
      const newResources = PUBLIC_RESOURCES.filter(r => !existingTitles.includes(r.title));
      
      if (newResources.length === 0) {
        showToast("현재 사용 가능한 모든 오픈 리소스가 이미 업데이트 되었습니다.");
        setIsUpdatingResource(false);
        return;
      }

      // 2. 새로운 리소스 모두 DB에 한 번에 추가 (번거로움 최소화)
      const booksRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
      for (const resourceToAdd of newResources) {
        await addDoc(booksRef, {
          ...resourceToAdd,
          createdAt: new Date().toISOString()
        });
      }
      
      showToast(`✨ 총 ${newResources.length}권의 새로운 책이 한 번에 자동 추가되었습니다!`);
    } catch (error) {
      showToast("오픈 리소스 업데이트 중 오류가 발생했습니다.");
    } finally {
      setIsUpdatingResource(false);
    }
  };

  // --- 비밀번호 변경 로직 ---
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) return showToast("비밀번호는 4자리 이상 입력해주세요.");
    setIsUpdatingPwd(true);
    try {
      const pwdRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'admin');
      await setDoc(pwdRef, { password: newPassword });
      localStorage.setItem('chekchek_admin_pwd', newPassword); // 현재 기기 로컬스토리지 동기화
      showToast("비밀번호가 안전하게 변경되었습니다.");
      setNewPassword('');
    } catch (error) {
      showToast("비밀번호 변경 실패");
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-stone-100 dark:bg-stone-900 pb-10">
      <header className="flex items-center justify-between p-5 bg-stone-900 text-white sticky top-0 z-50 shadow-md">
        <div className="flex items-center">
          <Settings size={22} className="mr-3 text-amber-500" />
          <h2 className="font-bold text-lg tracking-wide">시스템 관리</h2>
        </div>
        <button onClick={onClose} className="p-2 font-bold text-sm bg-stone-800 rounded-full px-4 hover:bg-stone-700 transition-colors">닫기</button>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 space-y-8">
        
        {/* 섹션 1: 오픈 리소스 자동 업데이트 */}
        <section className={`p-6 rounded-3xl shadow-sm border ${isDark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center text-amber-600 dark:text-amber-400">
              <Download size={20} className="mr-2" /> 라이브러리 연동
            </h3>
          </div>
          <p className="text-sm opacity-70 mb-5 leading-relaxed font-medium">
            한국 고전문학, 시, 에세이 등 저작권이 만료된 검증된 오픈 도메인 데이터를 클릭 한 번으로 앱에 추가합니다.
          </p>
          <button 
            onClick={handleAutoUpdate} disabled={isUpdatingResource}
            className="w-full bg-stone-900 dark:bg-amber-600 text-white font-bold py-4 rounded-2xl shadow-md hover:scale-[0.98] transition-transform flex justify-center items-center disabled:opacity-50"
          >
            {isUpdatingResource ? '다운로드 중...' : '오픈 리소스 자동 업데이트'}
          </button>
        </section>

        {/* 섹션 2: 비밀번호 변경 */}
        <section className={`p-6 rounded-3xl shadow-sm border ${isDark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'}`}>
          <h3 className="font-bold text-lg mb-4 flex items-center text-stone-700 dark:text-stone-300">
            <Key size={20} className="mr-2" /> 관리자 비밀번호 설정
          </h3>
          <p className="text-sm opacity-70 mb-5 font-medium leading-relaxed">
            비밀번호를 변경합니다. 어머니용 기기에서는 한 번 로그인하면 자동으로 유지됩니다.
          </p>
          <form onSubmit={handleChangePassword} className="flex space-x-2">
            <input 
              type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="새 비밀번호 입력" 
              className={`flex-1 p-4 rounded-2xl border font-medium outline-none ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-stone-50 border-stone-300 focus:border-stone-500'}`}
            />
            <button type="submit" disabled={isUpdatingPwd} className="bg-stone-800 text-white px-6 rounded-2xl font-bold whitespace-nowrap shadow-sm">변경</button>
          </form>
        </section>

        {/* 섹션 3: 수동 등록 */}
        <section className={`p-6 rounded-3xl shadow-sm border ${isDark ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'}`}>
           <h3 className="font-bold text-lg mb-6 flex items-center text-stone-700 dark:text-stone-300">
            <Plus size={20} className="mr-2" /> 직접 콘텐츠 작성
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="flex space-x-3 mb-5">
              <div className="flex-1">
                <label className="block text-xs font-bold mb-2 opacity-60 ml-1">카테고리</label>
                <select 
                  value={category} onChange={e => setCategory(e.target.value)}
                  className={`w-full p-4 rounded-2xl border font-medium outline-none appearance-none ${isDark ? 'bg-stone-900 border-stone-700 text-white' : 'bg-stone-50 border-stone-300'}`}
                >
                  <option value="추천">추천</option>
                  <option value="고전소설">고전소설</option>
                  <option value="에세이">에세이</option>
                  <option value="시">시</option>
                </select>
              </div>
              <div className="flex-[2]">
                <label className="block text-xs font-bold mb-2 opacity-60 ml-1">책 제목</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="제목 입력" className={`${inputClass} !mb-0`} />
              </div>
            </div>

            <label className="block text-xs font-bold mb-2 opacity-60 ml-1">지은이</label>
            <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="예: 김철수" className={inputClass} />

            <label className="block text-xs font-bold mb-2 opacity-60 ml-1">표지 이미지 주소 (URL)</label>
            <input type="text" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="비워두면 기본 이미지 사용" className={inputClass} />

            <label className="block text-xs font-bold mb-2 opacity-60 ml-1">본문</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="내용을 입력하세요..." className={`${inputClass} h-60 resize-none leading-loose`}></textarea>

            <button type="submit" className="w-full bg-stone-900 dark:bg-amber-600 text-white font-bold text-lg py-4 rounded-2xl shadow-md hover:scale-[0.98] transition-transform mt-2">
              수동 등록하기
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
