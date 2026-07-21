import { useCallback, useEffect, useRef, useState } from 'react';
import { computeViewportLayout, readDiagnostics, type Diagnostics } from './lib/diagnostics';
import { contrastRatio, round2, wcagLevel } from './lib/contrast';
import {
  FullscreenController,
  type FsState,
  type OrientationLockResult,
} from './lib/fullscreen';

const TOKENS = {
  accent: '#C0614A',
  accent2: '#D8846F',
  accentSoft: '#F6E6E1',
  kakao: '#FEE500',
} as const;

const LOCK_LABEL: Record<OrientationLockResult, string> = {
  idle: '대기 (전체화면 진입 시 시도)',
  unsupported: '미지원 (API 없음)',
  'not-fullscreen': '전체화면 아님 → 시도 안 함',
  locked: '잠금 성공',
  denied: '권한 거부 (정상 fallback)',
  error: '실패 (정상 fallback)',
};

const TOOL_LABELS = [
  '배경 밝기 조절',
  '배경 크기 및 위치',
  '가이드 배경 선택하기',
  '액자 사이즈 · 프레임 두께',
  '문구 스타일과 색상 지정',
  '내 공간에서 실제 크기 미리보기',
];

function useSafeErrors(): string[] {
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    const onError = (e: ErrorEvent): void => {
      setErrors((prev) => [...prev, `error: ${e.message} @ ${e.filename}:${e.lineno}`].slice(-8));
    };
    const onReject = (e: PromiseRejectionEvent): void => {
      const reason = e.reason instanceof Error ? e.reason.message : String(e.reason);
      setErrors((prev) => [...prev, `unhandledrejection: ${reason}`].slice(-8));
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onReject);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onReject);
    };
  }, []);
  return errors;
}

interface ViewportOwnerState {
  diag: Diagnostics;
  /** Pinch-zoom flag from the single pure layout decision (spec 002). */
  isZoomed: boolean;
}

/** Single layout owner: one place reacts to viewport/keyboard changes and writes CSS state.
 *  Zoom vs keyboard is decided by the pure computeViewportLayout — no second state authority. */
function useViewportOwner(): ViewportOwnerState {
  const [state, setState] = useState<ViewportOwnerState>(() => ({
    diag: readDiagnostics(),
    isZoomed: false,
  }));
  useEffect(() => {
    let raf = 0;
    const update = (): void => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = readDiagnostics();
        const vv = window.visualViewport;
        // One pure decision distinguishes pinch-zoom from a virtual-keyboard shrink so the
        // fixed CTA neither inflates (zoom mistaken for keyboard) nor loses keyboard handling.
        const layout = computeViewportLayout({
          innerHeight: window.innerHeight,
          vvHeight: vv ? vv.height : Number.NaN,
          offsetTop: vv ? vv.offsetTop : Number.NaN,
          scale: vv ? vv.scale : Number.NaN,
        });
        document.documentElement.style.setProperty('--kbd-inset', `${layout.keyboardInset}px`);
        setState({ diag: next, isZoomed: layout.isZoomed });
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
    };
  }, []);
  return state;
}

interface CanvasInfo {
  cssW: number;
  cssH: number;
  backW: number;
  backH: number;
  dpr: number;
}

const DPR_CAP = 2;

function useCanvasDpr(): { ref: React.RefObject<HTMLCanvasElement | null>; info: CanvasInfo } {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [info, setInfo] = useState<CanvasInfo>({ cssW: 0, cssH: 0, backW: 0, backH: 0, dpr: 1 });
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = (): void => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const backW = Math.max(1, Math.round(rect.width * dpr));
      const backH = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== backW) canvas.width = backW;
      if (canvas.height !== backH) canvas.height = backH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      // baseline grid to verify aspect preservation across rotate/resize
      ctx.strokeStyle = 'rgba(192,97,74,0.25)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo((w / 4) * i, 0);
        ctx.lineTo((w / 4) * i, h);
        ctx.moveTo(0, (h / 4) * i);
        ctx.lineTo(w, (h / 4) * i);
        ctx.stroke();
      }
      // fixed-ratio "frame" box
      const fw = w * 0.6;
      const fh = fw * 1.35;
      const fx = (w - fw) / 2;
      const fy = (h - fh) / 2;
      ctx.strokeStyle = TOKENS.accent;
      ctx.lineWidth = 3;
      ctx.strokeRect(fx, Math.max(6, fy), fw, Math.min(fh, h - 12));
      ctx.fillStyle = TOKENS.accent;
      ctx.font = '600 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DPR ' + dpr.toFixed(2), w / 2, 22);
      setInfo({ cssW: Math.round(w), cssH: Math.round(h), backW, backH, dpr });
    };
    draw();
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);
    window.addEventListener('orientationchange', draw);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', draw);
    };
  }, []);
  return { ref, info };
}

function SupportBadge({ ok, label }: { ok: boolean; label: string }): React.JSX.Element {
  return <span className={`badge ${ok ? 'ok' : 'no'}`}>{ok ? '지원' : '미지원'} · {label}</span>;
}

export function App(): React.JSX.Element {
  const { diag, isZoomed } = useViewportOwner();
  const errors = useSafeErrors();
  const { ref: canvasRef, info: canvasInfo } = useCanvasDpr();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [fsState, setFsState] = useState<FsState>('idle');
  const [fsMessage, setFsMessage] = useState<string>('');
  const [lockResult, setLockResult] = useState<OrientationLockResult>('idle');
  const controllerRef = useRef<FullscreenController | null>(null);
  if (!controllerRef.current) controllerRef.current = new FullscreenController();

  useEffect(() => {
    const c = controllerRef.current;
    if (!c) return;
    const unsub = c.subscribe((s) => setFsState(s));
    const unsubLock = c.subscribeLock((r) => setLockResult(r));
    const detach = c.attach();
    return () => {
      unsub();
      unsubLock();
      detach();
    };
  }, []);

  const requestFs = useCallback(async () => {
    const c = controllerRef.current;
    if (!c) return;
    const res = await c.request(document.documentElement);
    setFsMessage(res.ok ? '전체화면 진입 요청됨' : (res.reason ?? '전체화면을 사용할 수 없습니다.'));
  }, []);
  const exitFs = useCallback(async () => {
    await controllerRef.current?.exit();
  }, []);

  const whiteOnAccent = round2(contrastRatio('#FFFFFF', TOKENS.accent));
  const inkOnKakao = round2(contrastRatio('#1A1400', TOKENS.kakao));
  const caps = controllerRef.current.getCapabilities();

  return (
    <div className="page" data-zoomed={isZoomed ? 'true' : undefined}>
      <header className="brandbar">
        <h1>DENN · 플랫폼 호환성 POC</h1>
        <span className="note" style={{ color: 'rgba(255,255,255,.85)' }}>{diag.browserCategory}</span>
      </header>

      <main className="content">
        {/* A. 환경 진단 */}
        <section className="card" aria-labelledby="h-diag">
          <h2 id="h-diag">A · 환경 진단</h2>
          <dl className="kv">
            <dt>브라우저 범주</dt><dd>{diag.browserCategory}</dd>
            <dt>innerWidth × Height</dt><dd>{diag.innerWidth} × {diag.innerHeight}</dd>
            <dt>visualViewport</dt>
            <dd>
              {diag.visualViewport
                ? `${diag.visualViewport.width} × ${diag.visualViewport.height}  offsetTop ${diag.visualViewport.offsetTop}  scale ${diag.visualViewport.scale}`
                : '미지원'}
            </dd>
            <dt>devicePixelRatio</dt><dd>{diag.devicePixelRatio}</dd>
            <dt>orientation</dt><dd>{diag.orientation}</dd>
            <dt>100vh / svh / dvh</dt><dd>{diag.units.vh100} / {diag.units.svh100} / {diag.units.dvh100} px</dd>
            <dt>fullscreenEnabled</dt><dd>{String(diag.fullscreenEnabled)}</dd>
            <dt>orientation.lock</dt><dd>{String(diag.orientationLockSupported)}</dd>
          </dl>
          <div className="toolrow" style={{ marginTop: 10 }}>
            <SupportBadge ok={diag.css.dvh} label="100dvh" />
            <SupportBadge ok={diag.css.svh} label="100svh" />
            <SupportBadge ok={diag.css.colorMix} label="color-mix()" />
            <SupportBadge ok={diag.css.atProperty} label="@property" />
            <SupportBadge ok={diag.css.containerQueries} label="container query" />
            <SupportBadge ok={diag.css.fieldSizing} label="field-sizing" />
          </div>
          <div className="tw-probe" style={{ marginTop: 10 }} data-testid="tw-probe">
            Tailwind v4 color-mix 프로브 — 이 박스 배경이 연한 테라코타면 color-mix 렌더 정상.
          </div>
          <p className="note" style={{ marginTop: 8 }}>
            safe-area:{' '}
            <span
              style={{
                display: 'inline-block',
                padding: 'env(safe-area-inset-top,0) env(safe-area-inset-right,0) env(safe-area-inset-bottom,0) env(safe-area-inset-left,0)',
                outline: '1px dashed var(--accent)',
              }}
            >
              inset 반영 박스
            </span>
          </p>
        </section>

        {/* 명암비 (accessibility §3) */}
        <section className="card" aria-labelledby="h-contrast">
          <h2 id="h-contrast">명암비 (Modern Studio 토큰)</h2>
          <dl className="kv">
            <dt>흰색 / 테라코타 #C0614A</dt>
            <dd>
              {whiteOnAccent}:1 · {wcagLevel(whiteOnAccent) === 'fail' ? 'AA 미달' : wcagLevel(whiteOnAccent)}
            </dd>
            <dt>진회색 / 카카오 #FEE500</dt>
            <dd>{inkOnKakao}:1 · {wcagLevel(inkOnKakao)}</dd>
          </dl>
          <p className="note">
            일반 텍스트 AA=4.5:1. 미달 시 토큰을 임의 변경하지 않고 결과 보고에 대안 계산값만 제안(spec §3).
          </p>
        </section>

        {/* B. 반응형 스트레스 레이아웃 */}
        <section className="card" aria-labelledby="h-stress">
          <h2 id="h-stress">B · 반응형 편집기 스트레스</h2>
          <div className="canvas-wrap">
            <canvas ref={canvasRef} aria-label="비율 유지 프리뷰 캔버스" role="img" />
          </div>
          <p className="note">캔버스 CSS {canvasInfo.cssW}×{canvasInfo.cssH} · backing {canvasInfo.backW}×{canvasInfo.backH} · DPR≤{DPR_CAP}</p>
          <div className="toolrow" style={{ marginTop: 10 }}>
            {TOOL_LABELS.map((t) => (
              <button key={t} type="button" className="btn secondary">{t}</button>
            ))}
          </div>
          <div className="swatches" style={{ marginTop: 10 }} aria-label="색상 스와치">
            {Object.entries(TOKENS).map(([name, hex]) => (
              <span key={name} className="swatch" style={{ background: hex }} title={`${name} ${hex}`} role="img" aria-label={`${name} ${hex}`} />
            ))}
          </div>
        </section>

        {/* C. 키보드 · 바텀시트 트리거 */}
        <section className="card" aria-labelledby="h-form">
          <h2 id="h-form">C · 입력 · 키보드</h2>
          <div className="field">
            <label htmlFor="f-name">받는 분 성함</label>
            <input id="f-name" type="text" autoComplete="off" placeholder="예: 홍길동" />
          </div>
          <div className="field">
            <label htmlFor="f-memo">주문 메모 (긴 텍스트)</label>
            <textarea id="f-memo" rows={2} placeholder="배송 시 요청사항을 적어주세요" />
          </div>
          <button type="button" className="btn" onClick={() => setSheetOpen(true)} data-testid="open-sheet">
            바텀시트 열기
          </button>
        </section>

        {/* E. Fullscreen · orientation */}
        <section className="card" aria-labelledby="h-fs">
          <h2 id="h-fs">E · 전체화면 · 회전 fallback</h2>
          <div className="toolrow">
            <SupportBadge ok={caps.requestSupported} label="requestFullscreen" />
            <SupportBadge ok={caps.fullscreenEnabled} label="fullscreenEnabled" />
            <SupportBadge ok={caps.orientationLockSupported} label="orientation.lock" />
          </div>
          <p className="note" style={{ marginTop: 8 }}>상태 머신: <strong>{fsState}</strong></p>
          <p className="note" role="status" data-testid="lock-result">
            orientation lock: <strong>{LOCK_LABEL[lockResult]}</strong>
            <span className="note"> — 전체화면 진입이 확인된 뒤에만 시도. 미지원·거부·실패는 화면만 안내(계속 사용 가능).</span>
          </p>
          <div className="toolrow">
            <button type="button" className="btn" onClick={requestFs} data-testid="fs-request">전체화면 요청</button>
            <button type="button" className="btn secondary" onClick={exitFs}>전체화면 종료</button>
          </div>
          {fsMessage && <p className="note" role="status" style={{ marginTop: 8 }}>{fsMessage}</p>}
        </section>

        {/* D. 데이터가 많은 스크롤 영역 */}
        <section className="card" aria-labelledby="h-scroll">
          <h2 id="h-scroll">D · 스크롤 영역</h2>
          <div className="scrollbox" tabIndex={0} role="group" aria-label="템플릿 목록 스크롤 영역">
            <ul>
              {Array.from({ length: 30 }, (_, i) => (
                <li key={i}>템플릿 항목 {i + 1} — 긴 한국어 라벨이 줄바꿈되며 가로 overflow를 만들지 않아야 한다.</li>
              ))}
            </ul>
          </div>
        </section>

        {/* 오류 관측 (외부 전송 없음) */}
        <section className="card" aria-labelledby="h-err">
          <h2 id="h-err">오류 관측 (화면 전용)</h2>
          {errors.length === 0 ? (
            <p className="note" data-testid="error-count">예상하지 않은 오류 없음</p>
          ) : (
            <div className="diag-error" data-testid="error-count">{errors.join('\n')}</div>
          )}
        </section>
      </main>

      {/* sticky/fixed CTA + bottom nav (single layout owner writes --kbd-inset) */}
      <nav className="bottomnav" aria-label="주요 작업">
        <button type="button" className="btn secondary">시안 저장</button>
        <button type="button" className="btn kakao" data-testid="primary-cta">주문 제작 의뢰하기</button>
      </nav>

      {sheetOpen && (
        <div
          className="sheet-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSheetOpen(false);
          }}
        >
          <div className="sheet">
            <header>
              <strong id="sheet-title">배경 설정</strong>
              <button type="button" className="btn secondary" onClick={() => setSheetOpen(false)}>닫기</button>
            </header>
            <div className="sheet-body" tabIndex={0} role="group" aria-label="시트 내부 스크롤 영역">
              <div className="field">
                <label htmlFor="s-input">시트 내부 입력 (키보드 겹침 확인)</label>
                <input id="s-input" type="text" placeholder="여기 포커스 시 키보드와 CTA 겹침 확인" />
              </div>
              <ul>
                {Array.from({ length: 20 }, (_, i) => (
                  <li key={i}>시트 내부 스크롤 항목 {i + 1} — 페이지와 이중 스크롤 경쟁 없이 시트 내부만 스크롤.</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
