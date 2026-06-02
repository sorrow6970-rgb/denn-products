# 기반 단계 A — Storage 단일 진실(단조 리비전) 정밀 설계

> 작성: 2026-06-02. 핸드오프(`2026-06-01-session-handoff-operator-default.md`) "다음 세션=기반 먼저"의 1순위.
> 목표 = **운영자 ②가 LS/IDB 멀티스토어에서 durable** — 새로고침/소비자 쓰기에도 최신 운영자 값이 항상 이김.
> 메커니즘 선택: **단조 리비전 merge**(사용자 승인 2026-06-02). IDB-우선/clobber-guard 단독 조합보다 단순하고 자가복구.

---

## 0. 근본 원인 재확인 (핸드오프 진단 #1·#2, file:line 확정)

| # | 증상 | 근본 원인 | 위치 |
|---|---|---|---|
| **#1** | 운영자 ON 저장 → 새로고침 → OFF (②가 안 남음) | `mergeAdminStates`가 `scoreAdmin`(키 개수) 높은 store를 primary로 골라 **roomBackgroundSettings를 per-key primary 승**. stale지만 키 많은 store(보통 LS)의 ②가 fresh IDB ②를 이김 | merge L4448, `__rbs` L4458 |
| **#2** | 소비자 탭이 운영자 ②를 덮음 | 소비자가 in-memory stale ②를 포함한 전체 ADM blob을 **LS+IDB 양쪽**에 저장(`saveCurrentRoomKeyV48`→`writeAdminV48`) → 운영자 high-rev ②가 양쪽에서 사라짐 | writeAdminV48 L5082, LS write L13 |

> 멀티스토어: LS `denn_admin`(`saveCustomerAdminStateToLocalStorage` L13) / IDB `denn_shared_db→kv→denn_admin_state`(`writeAdminDbV48` L5069).
> 로드: `loadAdminFresh`(L4500) = IDB+LS → `mergeAdminStates` → 병합본 persist(피드백 루프).

---

## 1. 설계 원칙
- **운영자 키에 단조 증가 정수 `__opRev`.** 운영자가 ②(또는 배경 preset)를 저장할 때마다 +1.
- **merge = 룸키별 max-`__opRev` 승.** store 전체 점수 무시. → "최신 운영자 저장이 항상 이김" → 매 로드 자가복구.
- **LS clobber guard.** 소비자(비-admin) 쓰기는 운영자 키 `__opRev`를 낮추지 않음. merge가 두 store 중 max를 취하므로 **LS 한쪽만 지키면** IDB가 clobber돼도 복구.
- `__opRev` bump은 **실제 운영자 저장 funnel에서만**(로드-타임 persistAdmin은 bump 금지 — 가짜 증가 방지).
- 운영자 = `?adminRoomSetup=<key>`로 진입한 탭만. 소비자(파라미터 없음)는 절대 bump 안 함 → 무영향.

---

## 2. 구현 (3개 조각, 상호의존 — 함께 착지)

### 조각 1 — `__opRev` bump (운영자 저장 funnel 3곳)
헬퍼:
```
function stampOpRevV(st){ if(st&&typeof st==='object'){ st.__opRev=num(st.__opRev,0)+1; st.__opRevAt=new Date().toISOString(); } return st; }
```
호출(조건: admin-setup 모드 && key가 default-room/uploaded-room 아님):
- `saveSettingsV33`(L2932): `st[key]=Object.assign(...)` 직후.
- `saveCurrentRoomKeyV48`(L5105): `A.roomBackgroundSettings[key]=Object.assign(...)` 직후(restoreSun/resetDefaults 뒤).
- `markSavedAdminPreset`(L4661): `persistAdmin(A)` 직전(`st`이 운영자 키 값).

### 조각 2 — max-rev merge (`mergeAdminStates` L4458)
현재 `var __rbs=Object.assign({},secondary.rbs,primary.rbs)` (primary per-key 승) →
```
var pr=primary.roomBackgroundSettings||{}, sr=secondary.roomBackgroundSettings||{}, __rbs={};
Object.keys(sr).forEach(function(k){__rbs[k]=sr[k]});
Object.keys(pr).forEach(function(k){
  var p=pr[k], s=sr[k];
  if(p&&s&&typeof p==='object'&&typeof s==='object'&&(('__opRev'in p)||('__opRev'in s)))
    __rbs[k]=(num(s.__opRev,-1)>num(p.__opRev,-1))?s:p;   // 운영자 키: 최대 rev 승
  else __rbs[k]=p;                                          // 그 외: 기존 primary 승 보존
});
```
- 이후 deletedRoomKeys tombstone 로직(L4461~)은 그대로 `__rbs` 뒤에 유지.
- `__opRev` 없는 기존 키는 동작 불변(회귀 0).

### 조각 3 — LS clobber guard (`saveCustomerAdminStateToLocalStorage` L13)
```
function guardOpKeysLSV(A){
  try{ if(isAdminRoomSetupV48&&isAdminRoomSetupV48())return A; }catch(e){return A;}  // 운영자는 자유 쓰기
  try{
    var crb=(readLocalAdmin().roomBackgroundSettings)||{};
    Object.keys(crb).forEach(function(k){
      var c=crb[k]; if(!(c&&typeof c==='object'&&('__opRev'in c)))return;
      var a=(A&&A.roomBackgroundSettings)&&A.roomBackgroundSettings[k];
      if(!a||num(c.__opRev,0)>num(a&&a.__opRev,-1)){ A.roomBackgroundSettings=A.roomBackgroundSettings||{}; A.roomBackgroundSettings[k]=c; }
    });
  }catch(e){}
  return A;
}
```
stringify 직전 호출. 비-admin이 stale ②를 쓰려 하면 현재 LS의 high-rev ②를 보존(in-memory도 교정).

---

## 3. 검증 (콘솔 5원칙, 단일 탭, 한 스크린샷)
- 시뮬레이션: LS ②.__opRev=3(stale tilt=false) vs IDB ②.__opRev=8(fresh tilt=true) → `mergeAdminStates` 결과 ②.tilt===true && __opRev===8 (store 점수 무관).
- clobber: 비-admin write로 stale ②(rev=3) 저장 시도 → LS ② rev 여전히 8 유지.
- bump: 운영자 모드 저장 1회 → ②.__opRev 단조 +1.

## 4. 롤백
- 조각별 독립이지만 메커니즘은 3개 함께라야 성립. 전체 원복 = 이 커밋 revert.
- 직전 안전점: `519ed31`(설계 doc) / `d45dc8e`(단계1·2 + 단계3 revert).

## 4.5 검증 중 발견 — 회전 스키마 누락(별개 버그, 함께 수정)
실사용 검증(운영자 tilt ON→F5)에서 회전(9°)이 0으로 리셋. 진단 verifier(LS/IDB ② 비교)로 **기반 fix는 정상 확인**(tiltEnabled=true 양 store 일치, __opRev bump 34→36). 그러나 **회전 각도(`rm-tilt` 슬라이더)가 ② 저장 스키마에 아예 없음** — `currentSettingsV33`(L2876)·`currentRoomSettingsV48`(L5040) 둘 다 frameTiltEnabled·원근만 캡처. → 스토리지와 무관한 필드-완결성 버그.
수정: 신규 필드 `frameTiltDeg`를 6곳에 추가 — 저장 2(currentSettingsV33/V48), 적용 2(applySettingsV33 L2934/applyRoomSettings V48 L5025), 기본값 2(defaults L2864/V48 L4985). renderFrame은 `by('rm-tilt').value` 라이브 읽기라 슬라이더 값 복원만으로 반영(본체 무수정). enabled OFF는 옛 코드(하드새로고침 전) 잔재로, 기반 fix로 해소됨(데이터 증명).

## 5. 보호/불변
- renderFrame/zeRender/renderCase/fbExport·V363·Phase C 무수정(I5/I6).
- 로드-타임 persistAdmin은 bump 금지(조각1 조건이 save funnel 한정이라 자동 충족).
- 이 단계 통과 후에만 위치통합(D2)·단계3 강제전파 재시도.
