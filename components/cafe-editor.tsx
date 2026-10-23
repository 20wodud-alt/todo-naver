'use client';

import { useEffect, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Bold, CalendarDays, Check, CheckSquare, ChevronDown, ChevronLeft, CircleHelp, Clock3, FileText, Italic, Leaf, Link2, List, ListOrdered, LoaderCircle, LockKeyhole, Minus, Pin, Quote, Redo2, RotateCcw, Save, Strikethrough, Table2, Trash2, Underline, Undo2, X } from 'lucide-react';
import { categories, type Todo } from '@/lib/types';
import DOMPurify from 'dompurify';

export type EditorForm = Pick<Todo, 'title' | 'description' | 'category' | 'priority' | 'dueDate' | 'pinned'> & { descriptionHtml: string };
type Props = {
  form: EditorForm;
  setForm: React.Dispatch<React.SetStateAction<EditorForm>>;
  editingId?: string;
  busy: boolean;
  error: string;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
  onDelete: () => void;
};

export default function CafeEditor({ form, setForm, editingId, busy, error, onSubmit, onClose, onDelete }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<Range | null>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<EditorForm | null>(null);
  const [draftNotice, setDraftNotice] = useState('');
  const [showDraft, setShowDraft] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [url, setUrl] = useState('');
  const [linkError, setLinkError] = useState('');
  const [active, setActive] = useState<string[]>([]);
  const draftKey = `one-step-cafe:draft:${editingId || 'new'}`;

  useEffect(() => {
    if (bodyRef.current) {
      if (form.descriptionHtml) bodyRef.current.innerHTML = DOMPurify.sanitize(form.descriptionHtml);
      else bodyRef.current.innerText = form.description;
    }
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.title === 'string' && typeof parsed.description === 'string' && typeof parsed.descriptionHtml === 'string' && categories.includes(parsed.category) && ['높음', '보통', '낮음'].includes(parsed.priority) && typeof parsed.dueDate === 'string' && typeof parsed.pinned === 'boolean') setDraft(parsed);
      }
    } catch { /* Storage can be unavailable in private browser sessions. */ }
    // Each editor is mounted once with the selected post's initial contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncBody() {
    if (!bodyRef.current) return;
    const description = bodyRef.current.innerText;
    const descriptionHtml = bodyRef.current.innerHTML;
    setForm(current => ({ ...current, description, descriptionHtml }));
    rememberSelection();
  }
  function rememberSelection() {
    const selection = window.getSelection();
    if (selection?.rangeCount && bodyRef.current?.contains(selection.anchorNode)) {
      rangeRef.current = selection.getRangeAt(0).cloneRange();
      setActive(['bold', 'italic', 'underline', 'strikeThrough', 'justifyLeft', 'justifyCenter', 'justifyRight'].filter(command => document.queryCommandState(command)));
    }
  }
  function command(name: string, value?: string) {
    bodyRef.current?.focus();
    const selection = window.getSelection();
    if (rangeRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(rangeRef.current);
    }
    document.execCommand(name, false, value);
    syncBody();
  }
  function saveDraft() {
    try {
      localStorage.setItem(draftKey, JSON.stringify(form));
      setDraft({ ...form });
      setDraftNotice('작성 중인 글을 임시저장했어요.');
    } catch { setDraftNotice('임시저장 공간이 부족해요. 글을 등록해 주세요.'); }
  }
  function restoreDraft() {
    if (!draft) return;
    setForm(draft);
    const clean = DOMPurify.sanitize(draft.descriptionHtml);
    if (bodyRef.current) {
      if (clean) bodyRef.current.innerHTML = clean;
      else bodyRef.current.innerText = draft.description;
    }
    setForm({ ...draft, descriptionHtml: clean });
    rangeRef.current = null;
    setShowDraft(false);
    setDraftNotice('임시저장한 글을 불러왔어요.');
  }
  function insertLink() {
    let parsed: URL;
    try { parsed = new URL(url); } catch { setLinkError('https://로 시작하는 링크를 입력해 주세요.'); return; }
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) { setLinkError('웹 주소 또는 이메일 링크를 입력해 주세요.'); return; }
    if (rangeRef.current && !rangeRef.current.collapsed) command('createLink', url);
    else {
      const anchor = document.createElement('a');
      anchor.href = url; anchor.textContent = url;
      command('insertHTML', anchor.outerHTML);
    }
    setShowLink(false); setUrl(''); setLinkError('');
  }
  const tools = [
    { label: '인용구', icon: Quote, action: () => command('formatBlock', 'blockquote') },
    { label: '구분선', icon: Minus, action: () => command('insertHorizontalRule') },
    { label: '글머리 목록', icon: List, action: () => command('insertUnorderedList') },
    { label: '번호 목록', icon: ListOrdered, action: () => command('insertOrderedList') },
    { label: '체크 항목', icon: CheckSquare, action: () => command('insertText', '☐ ') },
    { label: '링크', icon: Link2, action: () => { rememberSelection(); setShowLink(!showLink); } },
    { label: '표', icon: Table2, action: () => command('insertHTML', '<table><tbody><tr><th>항목</th><th>내용</th></tr><tr><td><br></td><td><br></td></tr></tbody></table><p><br></p>') },
    { label: '일정', icon: CalendarDays, action: () => { dateRef.current?.focus(); dateRef.current?.showPicker?.(); } },
  ];

  return <form className="cafe-compose" onSubmit={event => {
    event.preventDefault();
    if (form.description.length > 5000) return;
    onSubmit(event);
  }}>
    <header className="compose-header"><div className="compose-heading"><button type="button" className="compose-back" aria-label="닫기" disabled={busy} onClick={onClose}><ChevronLeft size={21}/></button><h2>카페 글{editingId ? '수정' : '쓰기'}</h2><span>나의 할 일 게시판</span></div><div className="compose-header-actions"><div className="draft-control"><button type="button" className="draft-save" onClick={saveDraft} disabled={busy}><Save size={15}/><span>임시저장</span></button><button type="button" className="draft-count" aria-label="임시저장 목록" onClick={() => setShowDraft(!showDraft)}>{draft ? 1 : 0}</button>{showDraft && <div className="draft-popover"><strong>임시저장한 글</strong>{draft ? <><p>{draft.title || '제목 없는 글'}</p><button type="button" onClick={restoreDraft}><RotateCcw size={13}/> 불러오기</button></> : <p>임시저장한 글이 없어요.</p>}</div>}</div><button className="compose-submit" disabled={busy || form.description.length > 5000} aria-label={editingId ? '수정 저장' : '할 일 등록'}>{busy ? <LoaderCircle className="spin" size={17}/> : null}{editingId ? '수정' : '등록'}</button></div></header>
    <div className="compose-layout"><div className="compose-main">
      {draftNotice && <div className="draft-notice" role="status"><Check size={14}/>{draftNotice}<button type="button" aria-label="임시저장 알림 닫기" onClick={() => setDraftNotice('')}><X size={13}/></button></div>}
      <section className="compose-title-card"><div className="compose-selects"><label><span className="sr-only">카테고리</span><select aria-label="카테고리" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Todo['category'] })}>{categories.map(c => <option key={c} value={c}>{c} 게시판</option>)}</select><ChevronDown size={18}/></label><label><span className="sr-only">중요도</span><select aria-label="중요도" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Todo['priority'] })}><option value="높음">중요 · 높음</option><option value="보통">중요도 · 보통</option><option value="낮음">중요도 · 낮음</option></select><ChevronDown size={18}/></label></div><label className="compose-title-field"><span className="sr-only">할 일</span><input autoFocus aria-label="할 일" required maxLength={120} placeholder="제목을 입력해 주세요." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/><small>{form.title.length}<span>/120</span></small></label></section>
      <section className="compose-editor" aria-label="본문 편집기">
        <div className="insert-toolbar" aria-label="본문 도구">{tools.map(({ label, icon: Icon, action }) => <button type="button" key={label} title={label} onMouseDown={e => e.preventDefault()} onClick={action}><Icon size={23} strokeWidth={1.65}/><span>{label}</span></button>)}</div>
        <div className="format-toolbar" aria-label="글자 서식"><select aria-label="본문 스타일" defaultValue="p" onChange={e => command('formatBlock', e.target.value)}><option value="p">본문</option><option value="h2">제목 1</option><option value="h3">제목 2</option></select><select aria-label="글꼴" defaultValue="Arial" onChange={e => command('fontName', e.target.value)}><option value="Arial">기본서체</option><option value="Georgia">명조체</option></select><select aria-label="글자 크기" defaultValue="3" onChange={e => command('fontSize', e.target.value)}><option value="2">13</option><option value="3">16</option><option value="4">18</option><option value="5">24</option></select><i/>{[{ name: 'bold', label: '굵게', icon: Bold }, { name: 'italic', label: '기울임', icon: Italic }, { name: 'underline', label: '밑줄', icon: Underline }, { name: 'strikeThrough', label: '취소선', icon: Strikethrough }].map(({ name, label, icon: Icon }) => <button type="button" key={name} aria-label={label} aria-pressed={active.includes(name)} className={active.includes(name) ? 'format-active' : ''} title={label} onMouseDown={e => e.preventDefault()} onClick={() => command(name)}><Icon size={18}/></button>)}<i/>{[{ name: 'justifyLeft', label: '왼쪽 정렬', icon: AlignLeft }, { name: 'justifyCenter', label: '가운데 정렬', icon: AlignCenter }, { name: 'justifyRight', label: '오른쪽 정렬', icon: AlignRight }].map(({ name, label, icon: Icon }) => <button type="button" key={name} aria-label={label} title={label} onMouseDown={e => e.preventDefault()} onClick={() => command(name)}><Icon size={17}/></button>)}<i/><button type="button" aria-label="실행 취소" title="실행 취소" onMouseDown={e => e.preventDefault()} onClick={() => command('undo')}><Undo2 size={17}/></button><button type="button" aria-label="다시 실행" title="다시 실행" onMouseDown={e => e.preventDefault()} onClick={() => command('redo')}><Redo2 size={17}/></button></div>
        {showLink && <div className="link-panel"><Link2 size={15}/><input aria-label="링크 주소" type="url" placeholder="https://example.com" value={url} onChange={e => { setUrl(e.target.value); setLinkError(''); }}/><button type="button" onClick={insertLink}>넣기</button><button type="button" aria-label="링크 입력 닫기" onClick={() => setShowLink(false)}><X size={14}/></button>{linkError && <p role="alert">{linkError}</p>}</div>}
        <div ref={bodyRef} className="compose-body" role="textbox" aria-label="메모" aria-multiline="true" contentEditable suppressContentEditableWarning data-placeholder="내용을 입력하세요." onInput={syncBody} onKeyUp={rememberSelection} onMouseUp={rememberSelection} onPaste={event => { event.preventDefault(); command('insertText', event.clipboardData.getData('text/plain')); }} onDrop={event => event.preventDefault()}/>
        <div className="compose-body-footer"><span><FileText size={13}/> 오늘의 작은 실천을 자유롭게 기록해 보세요.</span><span className={form.description.length > 5000 ? 'text-limit-error' : ''}>{form.description.length.toLocaleString()} / 5,000</span></div>
      </section>{(error || form.description.length > 5000) && <p className="compose-error" role="alert">{error || '본문은 5,000자 이내로 입력해 주세요.'}</p>}
      <div className="compose-bottom-actions"><button type="button" className="compose-cancel" disabled={busy} onClick={onClose}>취소</button><button type="submit" className="compose-submit" disabled={busy || form.description.length > 5000}>{busy ? '저장 중…' : editingId ? '수정 저장' : '등록하기'}</button></div>
    </div>
    <aside className="compose-settings" aria-label="글 설정"><section className="settings-card privacy-card"><h3>공개 설정 <ChevronDown size={14}/></h3><p><LockKeyhole size={15}/><span>나만 보기</span><span className="private-badge">개인 카페</span></p><small>나의 할 일은 나만 확인할 수 있어요.</small></section><section className="settings-card"><h3>할 일 설정</h3><label className="setting-date"><span><CalendarDays size={15}/> 마감일</span><input ref={dateRef} aria-label="마감일" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}/></label><label className="setting-pin"><input type="checkbox" checked={form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })}/><span>게시판 상단에 고정</span><Pin size={13}/></label><p className="setting-caption">중요한 할 일은 맨 위에 두고 챙겨보세요.</p></section><div className="compose-tips"><Leaf size={19}/><strong>오늘도, 나만의 속도로.</strong><p>완벽한 계획이 아니어도 괜찮아요.<br/>작은 할 일 하나부터 시작해 보세요.</p></div>{editingId && <button type="button" className="compose-delete" disabled={busy} onClick={onDelete}><Trash2 size={14}/> 이 할 일 삭제하기</button>}<div className="compose-save-note"><Clock3 size={12}/> 등록한 내용은 다시 수정할 수 있어요.</div></aside></div>
  </form>;
}
