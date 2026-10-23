'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, BookOpen, BriefcaseBusiness, CalendarDays, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Coffee, FileText, Flag, Flower2, FolderOpen, LayoutList, Leaf, ListTodo, LoaderCircle, Menu, Pencil, Pin, Plus, Search, Sparkles, Star, Sun, Trash2, UserRound, X } from 'lucide-react';
import { categories, type Category, type Todo } from '@/lib/types';
import CafeEditor, { type EditorForm } from './cafe-editor';

const categoryIcons = { 업무: BriefcaseBusiness, 개인: UserRound, 공부: BookOpen, 일상: Coffee };
type View = 'all' | 'today' | 'important' | 'completed' | Category;
const viewNames: Record<View, string> = { all: '전체 할 일', today: '오늘의 할 일', important: '중요한 할 일', completed: '완료한 할 일', 업무: '업무', 개인: '개인', 공부: '공부', 일상: '일상' };
const blank = { title: '', description: '', descriptionHtml: '', category: '업무' as Category, priority: '보통' as Todo['priority'], dueDate: '', pinned: false };
function localDate() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }

export default function TodoCafe() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>('all');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [modal, setModal] = useState<'create' | Todo | null>(null);
  const [form, setForm] = useState<EditorForm>(blank);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [help, setHelp] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [today, setToday] = useState('');
  const modalRef = useRef<HTMLDialogElement>(null);
  const confirmationRef = useRef<HTMLDialogElement>(null);
  const helpRef = useRef<HTMLDialogElement>(null);

  useEffect(() => { setToday(localDate()); void load(); }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3200); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (modal) { modalRef.current?.showModal(); document.body.style.overflow = 'hidden'; } else { modalRef.current?.close(); document.body.style.overflow = ''; } return () => { document.body.style.overflow = ''; }; }, [modal]);
  useEffect(() => { if (deleteIds) confirmationRef.current?.showModal(); else confirmationRef.current?.close(); }, [deleteIds]);
  useEffect(() => { if (help) helpRef.current?.showModal(); else helpRef.current?.close(); }, [help]);
  useEffect(() => { setPage(1); setSelected([]); }, [view, query, status]);

  async function load() {
    setLoading(true); setError('');
    try { const response = await fetch('/api/todos', { cache: 'no-store' }); if (!response.ok) throw new Error('목록을 불러오지 못했어요. 다시 시도해 주세요.'); setTodos(await response.json()); }
    catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }
  async function api(method: string, body: unknown) {
    const response = await fetch('/api/todos', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '요청을 처리하지 못했어요.');
    return data;
  }
  async function update(todo: Todo, changes: Partial<Todo>) {
    if (busy) return;
    setBusy(true);
    try { const updated = await api('PATCH', { id: todo.id, ...changes }); setTodos(items => items.map(t => t.id === updated.id ? updated : t)); if ('completed' in changes) setToast(changes.completed ? '한 걸음 더 해냈어요! 완료한 일에 담았어요.' : '다시 진행 중인 할 일로 변경했어요.'); }
    catch (e) { setToast((e as Error).message); } finally { setBusy(false); }
  }
  function openEditor(todo?: Todo) { setError(''); setForm(todo ? { title: todo.title, description: todo.description, descriptionHtml: todo.descriptionHtml || '', category: todo.category, priority: todo.priority, dueDate: todo.dueDate, pinned: todo.pinned } : { ...blank, dueDate: today, category: categories.includes(view as Category) ? view as Category : '업무' }); setModal(todo || 'create'); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result: Todo = await api(modal === 'create' ? 'POST' : 'PATCH', { ...form, ...(modal && modal !== 'create' ? { id: modal.id } : {}) });
      setTodos(items => modal === 'create' ? [result, ...items] : items.map(t => t.id === result.id ? result : t));
      try { localStorage.removeItem(`one-step-cafe:draft:${modal && modal !== 'create' ? modal.id : 'new'}`); } catch {}
      setModal(null); setToast(modal === 'create' ? '새로운 할 일을 등록했어요.' : '할 일을 수정했어요.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function remove() {
    if (!deleteIds) return; setBusy(true);
    try { await api('DELETE', { ids: deleteIds }); setTodos(items => items.filter(t => !deleteIds.includes(t.id))); setSelected([]); setDeleteIds(null); setModal(null); setToast('선택한 할 일을 삭제했어요.'); }
    catch (e) { setToast((e as Error).message); } finally { setBusy(false); }
  }
  function navigate(next: View) { setView(next); setStatus('all'); setQuery(''); setMobileMenu(false); }
  const completed = todos.filter(t => t.completed).length;
  const todayTasks = todos.filter(t => t.dueDate === today);
  const todayCompleted = todayTasks.filter(t => t.completed).length;
  const progress = todayTasks.length ? Math.round(todayCompleted / todayTasks.length * 100) : 0;
  const filtered = useMemo(() => todos.filter(t => {
    if (view === 'today' && t.dueDate !== today) return false;
    if (view === 'important' && t.priority !== '높음' && !t.pinned) return false;
    if (view === 'completed' && !t.completed) return false;
    if (categories.includes(view as Category) && t.category !== view) return false;
    if (status === 'pending' && t.completed || status === 'completed' && !t.completed) return false;
    return `${t.title} ${t.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase());
  }).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sort === 'due') return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
    if (sort === 'priority') return ['높음', '보통', '낮음'].indexOf(a.priority) - ['높음', '보통', '낮음'].indexOf(b.priority);
    return b.createdAt.localeCompare(a.createdAt);
  }), [todos, view, status, query, sort, today]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const dateLabel = today ? new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Seoul' }).format(new Date(`${today}T12:00:00+09:00`)) : '';
  const navItems: { key: View; icon: typeof LayoutList; count: number }[] = [
    { key: 'all', icon: LayoutList, count: todos.length }, { key: 'today', icon: Sun, count: todayTasks.filter(t => !t.completed).length }, { key: 'important', icon: Star, count: todos.filter(t => t.priority === '높음' || t.pinned).length }, { key: 'completed', icon: CheckCheck, count: completed },
  ];

  return <>
    <header className="global-header"><div className="global-inner"><a className="brand" href="/">열매담 <span>카페</span></a><div className="global-links"><span>나만의 작은 실천 공간</span><i /><button onClick={() => setHelp(true)}>이용안내 <CircleHelp size={13} /></button><span className="user-dot">나</span><span className="user-name">나의 카페 <ChevronDown size={12} /></span></div></div></header>
    <div className="site-wrap">
      <section className="hero"><div className="hero-dots"/><div className="hero-copy"><span className="eyebrow">MY DAILY ROUTINE, MY LITTLE MIRACLE</span><h1>하루 한 걸음<span className="hero-period">.</span></h1><p>작은 실천이 모여, 더 나은 나를 만듭니다.</p><div className="hero-tags"><span>나만의 투두 카페</span><i />매일 조금씩, 꾸준하게</div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><span className="art-star">✦</span><div className="check-medallion"><Check size={67} strokeWidth={1.8}/></div><span className="art-spark">✧</span><span className="art-caption">ONE STEP AT A TIME</span></div></section>
      <div className="mobile-bar"><button onClick={() => setMobileMenu(!mobileMenu)}><Menu size={18}/> 게시판 메뉴</button><span>오늘도 한 걸음 🌱</span></div>
      <div className="layout">
        <aside className={mobileMenu ? 'sidebar mobile-open' : 'sidebar'}>
          <div className="sidebar-tabs"><span>카페정보</span><span>나의활동</span></div>
          <div className="cafe-profile"><div className="cafe-avatar"><Leaf size={26}/><span>ONE STEP</span></div><div><strong>하루</strong><span className="manager-badge">매니저</span><p>나를 위한 작은 기록</p><small>2026. 10. 23. 개설</small></div></div>
          <div className="cafe-details"><span><Leaf size={13}/> 새싹 멤버</span><span>나의 개인 카페</span></div>
          <button className="primary new-todo" onClick={() => openEditor()}><Pencil size={15}/> 할 일 쓰기</button>
          <div className="nav-heading"><Star size={13} fill="currentColor"/> 나의 할 일 게시판</div>
          <nav className="main-nav" aria-label="할 일 게시판">{navItems.map(({ key, icon: Icon, count }) => <button key={key} className={view === key ? 'nav-item active' : 'nav-item'} onClick={() => navigate(key)}><Icon size={16}/><span>{viewNames[key]}</span><small>{count}</small></button>)}</nav>
          <div className="nav-heading category-heading"><FolderOpen size={14}/> 카테고리</div>
          <nav className="category-nav" aria-label="카테고리">{categories.map(category => { const Icon = categoryIcons[category]; return <button key={category} className={view === category ? 'nav-item active' : 'nav-item'} onClick={() => navigate(category)}><Icon size={15}/><span>{category}</span><small>{todos.filter(t => t.category === category).length}</small></button>; })}</nav>
          <div className="sidebar-note"><Flower2 size={24}/><strong>완벽하지 않아도 괜찮아요.</strong><p>오늘의 작은 실천 하나면 충분해요.<br/>나만의 속도로 함께 가요.</p><span>오늘도, 한 걸음 🌱</span></div>
          <button className="sidebar-help" onClick={() => setHelp(true)}><CircleHelp size={14}/> 투두 카페 이용안내<ChevronRight size={13}/></button>
        </aside>
        <main>
          <div className="breadcrumb">나의 카페 <ChevronRight size={12}/> 할 일 게시판 <ChevronRight size={12}/><span>{viewNames[view]}</span></div>
          <section className="welcome"><div><span className="section-kicker"><span className="green-dot"/> TODAY’S LITTLE MIRACLE</span><h2>열매담 상세페이지</h2><p>해야 할 일은 가볍게 적고, 해낸 일은 기분 좋게 체크해요.</p></div><div className="today-date"><CalendarDays size={15}/>{dateLabel}</div></section>
          <section className="daily-summary" aria-label="할 일 요약"><div className="summary-cell"><span><ListTodo size={15}/> 오늘의 할 일</span><strong>{todayTasks.length}<small>개</small></strong></div><div className="summary-cell"><span><CheckCheck size={15}/> 완료한 할 일</span><strong className="green-text">{todayCompleted}<small>개</small></strong></div><div className="summary-cell"><span><Flag size={14}/> 남은 할 일</span><strong>{todayTasks.length - todayCompleted}<small>개</small></strong></div><div className="summary-progress"><div><span>오늘의 달성률</span><strong>{progress}<small>%</small></strong></div><div className="progress-track"><div style={{ width: `${progress}%` }}/></div><p>{progress === 100 ? '오늘의 할 일을 모두 해냈어요. 멋져요! 🎉' : '차근차근, 잘하고 있어요!'}<Sparkles size={12}/></p></div></section>
          <div className="notice"><span className="notice-badge">공지</span><p>작은 성취도 소중하게. 완료 버튼을 눌러 오늘의 한 걸음을 기록해 보세요.</p><Leaf size={14}/></div>
          <section className="board">
            <div className="board-heading"><div><h2>{viewNames[view]}</h2><span>{filtered.length}</span></div><button className="board-write" onClick={() => openEditor()}><Plus size={15}/> 할 일 쓰기</button></div>
            <div className="board-toolbar"><div className="status-tabs" aria-label="완료 상태"><button className={status === 'all' ? 'selected' : ''} onClick={() => setStatus('all')}>전체</button><button className={status === 'pending' ? 'selected' : ''} onClick={() => setStatus('pending')}>진행 중</button><button className={status === 'completed' ? 'selected' : ''} onClick={() => setStatus('completed')}>완료</button></div><label className="sort-select"><select aria-label="정렬 기준" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="newest">최신 등록순</option><option value="due">마감일순</option><option value="priority">중요도순</option></select><ArrowDown size={12}/></label></div>
            {loading ? <div className="empty-state"><LoaderCircle className="spin" size={25}/><p>할 일을 불러오고 있어요.</p></div> : error && !modal ? <div className="empty-state"><p role="alert">{error}</p><button className="secondary" onClick={load}>다시 불러오기</button></div> : <>
              <div className="table-scroll"><table><thead><tr><th className="check-column"><input type="checkbox" aria-label="현재 페이지 전체 선택" checked={visible.length > 0 && visible.every(t => selected.includes(t.id))} onChange={e => setSelected(e.target.checked ? [...new Set([...selected, ...visible.map(t => t.id)])] : selected.filter(id => !visible.some(t => t.id === id)))}/></th><th className="category-column">분류</th><th className="title-column">할 일</th><th className="priority-column">중요도</th><th className="date-column">마감일</th><th className="status-column">상태</th><th className="pin-column"><Pin size={12}/></th></tr></thead><tbody>{visible.map(todo => <tr key={todo.id} className={`${todo.completed ? 'row-done' : ''} ${todo.pinned ? 'row-pinned' : ''}`}><td><input type="checkbox" aria-label={`${todo.title} 선택`} checked={selected.includes(todo.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids, todo.id] : ids.filter(id => id !== todo.id))}/></td><td><span className={`category-tag category-${todo.category}`}>{todo.category}</span></td><td className="todo-title-cell"><button className="todo-title" onClick={() => openEditor(todo)}>{todo.pinned && <span className="pinned-label">필독</span>}<span>{todo.title}</span>{todo.description && <FileText size={12} className="memo-icon"/>}</button></td><td><span className={`priority priority-${todo.priority}`}><i/>{todo.priority}</span></td><td className={todo.dueDate && todo.dueDate < today && !todo.completed ? 'due overdue' : 'due'}>{todo.dueDate ? todo.dueDate.slice(2).replaceAll('-', '.') : '기한 없음'}</td><td><button disabled={busy} aria-label={`${todo.title} ${todo.completed ? '진행 중으로' : '완료로'} 변경`} className={todo.completed ? 'status-badge done' : 'status-badge pending'} onClick={() => update(todo, { completed: !todo.completed })}>{todo.completed ? <><Check size={11}/> 완료</> : '진행 중'}</button></td><td><button className={todo.pinned ? 'pin-button pinned' : 'pin-button'} aria-label={`${todo.title} ${todo.pinned ? '고정 해제' : '상단 고정'}`} disabled={busy} onClick={() => update(todo, { pinned: !todo.pinned })}><Star size={14} fill={todo.pinned ? 'currentColor' : 'none'}/></button></td></tr>)}</tbody></table></div>
              {!filtered.length && <div className="empty-state"><Coffee size={30}/><strong>{query ? '검색 결과가 없어요' : '아직 등록된 할 일이 없어요'}</strong><p>{query ? '다른 검색어나 분류로 찾아보세요.' : '작은 할 일 하나로 오늘을 시작해 볼까요?'}</p><button className="secondary" onClick={() => query ? setQuery('') : openEditor()}>{query ? '검색 초기화' : '첫 할 일 쓰기'}</button></div>}
            </>}
            <div className="board-bottom"><div className="selection-actions"><button className="secondary" disabled={!selected.length || busy} onClick={() => setDeleteIds(selected)}><Trash2 size={12}/> 선택 삭제{selected.length > 0 ? ` (${selected.length})` : ''}</button><span>총 <b>{filtered.length}</b>개의 할 일</span></div><span className="board-tip"><Check size={12}/> 상태를 누르면 완료할 수 있어요</span></div>
            <div className="pagination"><button aria-label="이전 페이지" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={15}/></button>{Array.from({ length: pageCount }, (_, i) => i + 1).filter(p => Math.abs(p - currentPage) <= 2).map(p => <button key={p} className={currentPage === p ? 'current' : ''} onClick={() => setPage(p)}>{p}</button>)}<button aria-label="다음 페이지" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={15}/></button></div>
            <div className="search-area"><div className="search-input"><Search size={16}/><input aria-label="할 일 검색" placeholder="찾고 싶은 할 일을 검색해 보세요" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="검색어 지우기" onClick={() => setQuery('')}><X size={14}/></button>}</div></div>
          </section>
          <div className="bottom-quote"><span>“</span><p>큰 변화는 언제나 작은 한 걸음에서 시작돼요.</p><span>”</span></div>
        </main>
      </div>
      <footer><div className="footer-brand">하루 한 걸음<span>투두 카페</span></div><p>오늘의 나를 기록하고, 내일의 나를 응원하는 공간.</p><span>© 2026 ONE STEP CAFE</span></footer>
    </div>
    <dialog ref={modalRef} className="editor-dialog cafe-editor-dialog" aria-label="Cafe editor" onCancel={event => { if (busy) event.preventDefault(); else { setModal(null); setError(''); } }}>{modal && <CafeEditor key={modal === 'create' ? 'new' : modal.id} form={form} setForm={setForm} editingId={modal === 'create' ? undefined : modal.id} busy={busy} error={error} onSubmit={save} onClose={() => { if (!busy) { setModal(null); setError(''); } }} onDelete={() => { if (modal !== 'create') setDeleteIds([modal.id]); }}/>}</dialog>
    <dialog ref={confirmationRef} className="confirm-dialog" onCancel={() => setDeleteIds(null)}><Trash2 size={27} className="delete-icon"/><h2>선택한 할 일을 삭제할까요?</h2><p>{deleteIds?.length}개의 할 일이 삭제돼요. 삭제 후에는 되돌릴 수 없어요.</p><div className="confirm-buttons"><button className="secondary" onClick={() => setDeleteIds(null)}>취소</button><button className="danger-button" disabled={busy} onClick={remove}>{busy ? '삭제 중…' : '삭제하기'}</button></div></dialog>
    <dialog ref={helpRef} className="help-dialog" onCancel={() => setHelp(false)}><div className="modal-heading"><h2>투두 카페 이용안내 🌱</h2><button className="icon-button" aria-label="닫기" onClick={() => setHelp(false)}><X size={20}/></button></div><p><b>1. 작은 한 걸음 적기</b><br/>‘할 일 쓰기’에서 제목, 분류, 마감일과 메모를 기록해요.</p><p><b>2. 오늘의 실천 확인하기</b><br/>왼쪽 게시판으로 분류하고, 검색과 정렬로 필요한 일을 찾아요. 별을 누르면 목록 상단에 고정돼요.</p><p><b>3. 해낸 일 체크하기</b><br/>‘진행 중’을 누르면 완료돼요. 제목을 누르면 수정하거나 삭제할 수 있어요.</p><div className="help-note">할 일은 앱의 저장소에 보관돼요. 임시저장한 글은 현재 브라우저에만 저장됩니다.</div><button className="primary" onClick={() => setHelp(false)}>한 걸음 시작하기 <ArrowUpRight size={15}/></button></dialog>
    {toast && <div className="toast" role="status"><Check size={16}/>{toast}<button aria-label="알림 닫기" onClick={() => setToast('')}><X size={14}/></button></div>}
  </>;
}
