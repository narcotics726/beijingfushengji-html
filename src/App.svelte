<script lang="ts">
  import {
    game,
    events,
    endResult,
    settings,
    moveToLoc,
    buyAction,
    sellAction,
    bankDepositAction,
    bankWithdrawAction,
    hospitalAction,
    postOfficeAction,
    repayAction,
    rentAction,
    wangbaAction,
    airportAction,
    startNewGame,
    advanceEvent,
    exitGame,
    setEndName,
    updateSettings,
  } from './ui/game'
  import { maxBuyQty, maxSellQty } from './core/actions'
  import { getTop10 } from './core/storage'
  import { playSound } from './ui/sound'
  import { GOODS } from './core/data/goods'
  import { LOCATIONS } from './core/data/locations'
  import { parseTicker } from './core/data/texts'
  import theme from './ui/skins/retro/theme'
  import LedNumber from './ui/components/LedNumber.svelte'

  const g = $derived($game)
  const marketGoods = $derived(GOODS.filter((x) => g.prices[x.id] > 0))
  const houseGoods = $derived(GOODS.filter((x) => g.holdings[x.id] > 0))
  const locName = $derived(LOCATIONS.find((l) => l.id === g.loc)?.name ?? '—')
  const tickerItems = parseTicker()
  const tickerText = tickerItems.join('　·　')

  let buyQty = $state<Record<number, number>>({})
  let sellQty = $state<Record<number, number>>({})
  let amountDlg = $state<null | { mode: 'deposit' | 'withdraw' | 'heal' | 'repay'; label: string; max: number }>(null)
  let amountValue = $state(0)
  let showSettings = $state(false)
  let showBank = $state(false)
  let showBoss = $state(false)
  let showLocation = $state(false)
  let showRank = $state(false)
  let showStatus = $state(false)

  // 原版买卖数量默认=最大；金钱/价格/持仓一变化即重算为当前可买/可卖上限（可为 0）
  $effect(() => {
    const gg = g
    for (const gd of marketGoods) buyQty[gd.id] = maxBuyQty(gg, gd.id)
    for (const gd of houseGoods) sellQty[gd.id] = maxSellQty(gg, gd.id)
  })

  function qv(map: Record<number, number>, id: number) {
    return map[id] ?? 0
  }
  function pct(max: number, val: number) {
    return max <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((val / max) * 100)))
  }
  function goTo(id: number) {
    moveToLoc(id)
    showLocation = false
  }
  function goBank() {
    if (g.soundEnabled) playSound('opendoor.wav')
    showBank = true
  }
  function bankDep() {
    showBank = false
    openAmount('deposit', '您存多少钱?', g.cash)
  }
  function bankWit() {
    showBank = false
    openAmount('withdraw', '您提走多少钱?', g.bank)
  }
  function goHospital() {
    if (g.health >= 100) hospitalAction(0)
    else openAmount('heal', `大夫高兴地拍着手：“您的健康点数是${g.health}，需要治疗的点数是${100 - g.health}。`, 100 - g.health)
  }
  function goPost() {
    if (g.debt > 0) {
      if (g.soundEnabled) playSound('opendoor.wav')
      openAmount('repay', `村长在电话中说："铁牛，你欠俺${g.debt}元，快还!"`, Math.min(g.cash, g.debt))
    } else {
      postOfficeAction()
    }
  }
  function openAmount(mode: 'deposit' | 'withdraw' | 'heal' | 'repay', label: string, max: number) {
    amountDlg = { mode, label, max }
    amountValue = max
  }
  function confirmAmount() {
    if (!amountDlg) return
    const v = Math.max(0, Math.min(amountDlg.max, Math.floor(amountValue)))
    const m = amountDlg.mode
    amountDlg = null
    if (m === 'deposit') bankDepositAction(v)
    else if (m === 'withdraw') bankWithdrawAction(v)
    else if (m === 'repay') repayAction(v)
    else hospitalAction(v)
  }
</script>

<!-- 常驻顶区：标题 + 状态条一起 sticky -->
<div class="sticky-top">
<!-- 顶部标题 -->
<header class="topbar">
  <div class="banner" style="background-image:url({theme.bg})"></div>
  <h1>北京浮生({40 - g.timeLeft}/40天)</h1>
  <div class="top-actions">
    <button onclick={() => (showSettings = true)}>⚙设置</button>
    <button onclick={() => startNewGame()}>新游戏</button>
  </div>
</header>

<!-- 状态条 常驻，点开展开 -->
<section
  class="statusbar panel"
  role="button"
  tabindex="0"
  onclick={() => (showStatus = !showStatus)}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      showStatus = !showStatus
      e.preventDefault()
    }
  }}
>
  <span class="cell"><span class="lab">现</span><LedNumber value={g.cash} lit="#2ee22e" height={28} /></span>
  <span class="cell"><span class="lab">债</span><LedNumber value={g.debt} lit="#e03030" height={28} /></span>
  <span class="cell"><span class="lab">康</span><LedNumber value={g.health} lit="#2eb0e0" height={28} /></span>
  <span class="cell"><span class="lab">存</span><LedNumber value={g.bank} lit="#2ee22e" height={28} /></span>
  <span class="cell"><span class="lab">名</span><LedNumber value={g.fame} lit={g.fame < 60 ? '#e03030' : '#2ee22e'} height={28} /></span>
  {#if showStatus}
    <span class="cell"><span class="lab">位</span><LedNumber value={g.total} lit="#e08020" height={20} /><span class="sl">/</span><LedNumber value={g.coat} lit="#e08020" height={20} /></span>
  {/if}
</section>
</div>

<!-- 位置条（薄）→ 弹选地点 -->
<div class="locrow">
  <span class="loc-now">📍 {locName}</span>
  <button onclick={() => (showLocation = true)}>去别处…</button>
</div>

<!-- 主区分屏：黑市上半(买) / 出租屋下半(卖)，两栏同屏、各自滚动 -->
<main class="core">
  <section class="pane market">
    <h2>地铁口黑市</h2>
    <div class="list">
      {#each marketGoods as good (good.id)}
        <div class="row">
          <div class="fillbar">
            <div class="fill" style="width:{pct(maxBuyQty(g, good.id), qv(buyQty, good.id))}%"></div>
            <span class="label"><span class="nm">{good.name}</span><span class="inf">{g.prices[good.id]}元 ×{qv(buyQty, good.id)}/{maxBuyQty(g, good.id)}</span></span>
            <input class="range" type="range" min="0" max={maxBuyQty(g, good.id)} step="1" bind:value={buyQty[good.id]} />
          </div>
          <button class="act" disabled={maxBuyQty(g, good.id) <= 0} onclick={() => buyAction(good.id, qv(buyQty, good.id))}>买</button>
        </div>
      {:else}
        <div class="empty">今日黑市无货。</div>
      {/each}
    </div>
  </section>

  <section class="pane house">
    <h2>您在海淀的出租屋</h2>
    <div class="list">
      {#each houseGoods as good (good.id)}
        <div class="row">
          <div class="fillbar">
            <div class="fill" style="width:{pct(maxSellQty(g, good.id), qv(sellQty, good.id))}%"></div>
            <span class="label"><span class="nm">{good.name}</span><span class="inf">进{g.holdCost[good.id]}元 ×{qv(sellQty, good.id)}/{maxSellQty(g, good.id)}</span></span>
            <input class="range" type="range" min="0" max={maxSellQty(g, good.id)} step="1" bind:value={sellQty[good.id]} />
          </div>
          <button class="act" disabled={maxSellQty(g, good.id) <= 0} onclick={() => sellAction(good.id, qv(sellQty, good.id))}>卖</button>
        </div>
      {:else}
        <div class="empty">还没有货物。</div>
      {/each}
    </div>
  </section>
</main>

<!-- 子系统平铺底部（不占主滚动） -->
<section class="subsys panel">
  <div class="subsys-grid">
    <button onclick={() => goBank()}>银行</button>
    <button onclick={() => goHospital()}>医院</button>
    <button onclick={() => goPost()}>邮局</button>
    <button onclick={() => rentAction()}>租房</button>
    <button onclick={() => wangbaAction()}>网吧</button>
    <button onclick={() => airportAction()}>机场</button>
    <button onclick={() => (showRank = true)}>排行榜</button>
    <button class="boss" onclick={() => (showBoss = true)}>老板</button>
    <button class="danger" onclick={() => exitGame()}>离开</button>
  </div>
</section>

<!-- 底部新闻滚动条 -->
<footer class="ticker">
  <span class="ticker-title">新闻</span>
  <div class="ticker-track"><span>{tickerText}</span></div>
</footer>

<!-- 弹选地点 -->
{#if showLocation}
  <div class="modal">
    <div class="box">
      <h2>北京地图</h2>
      <div class="loc-grid">
        {#each LOCATIONS as loc (loc.id)}
          <button class:active={g.loc === loc.id} onclick={() => goTo(loc.id)}>{loc.name}</button>
        {/each}
      </div>
      <div class="actions"><button onclick={() => (showLocation = false)}>关闭</button></div>
    </div>
  </div>
{/if}

<!-- 金额 / 治疗（滑杆） -->
{#if amountDlg}
  <div class="modal">
    <div class="box">
      <p class="dlg-label">{amountDlg.label}</p>
      <div class="slider-row">
        <input type="range" min="0" max={amountDlg.max} bind:value={amountValue} />
        <b class="qty">{amountValue}</b>
      </div>
      <div class="actions">
        <button onclick={() => confirmAmount()}>确定</button>
        <button onclick={() => (amountDlg = null)}>取消</button>
      </div>
    </div>
  </div>
{/if}

<!-- 银行 -->
{#if showBank}
  <div class="modal">
    <div class="box">
      <h2>银行</h2>
      <p>客户您好! 您的现金是{g.cash}, 您的存款是{g.bank}. 请问您要...</p>
      <div class="actions">
        <button onclick={() => bankDep()}>存款</button>
        <button onclick={() => bankWit()}>取款</button>
        <button onclick={() => (showBank = false)}>关闭</button>
      </div>
    </div>
  </div>
{/if}

<!-- 排行榜（B13） -->
{#if showRank}
  <div class="modal">
    <div class="box">
      <h2>富豪榜</h2>
      <ol class="rank">
        {#each getTop10() as h, i (i)}
          <li>{h.name} — {h.score}元（{h.fame}）</li>
        {/each}
      </ol>
      <div class="actions"><button onclick={() => (showRank = false)}>关闭</button></div>
    </div>
  </div>
{/if}

<!-- 设置 -->
{#if showSettings}
  <div class="modal">
    <div class="box">
      <h2>设置</h2>
      <label><input type="checkbox" checked={$settings.sound} onchange={(e) => updateSettings({ sound: e.currentTarget.checked })} /> 声音</label>
      <label><input type="checkbox" checked={$settings.hack} onchange={(e) => updateSettings({ hack: e.currentTarget.checked })} /> 黑客事件</label>
      <div class="actions"><button onclick={() => (showSettings = false)}>关闭</button></div>
    </div>
  </div>
{/if}

<!-- Boss 保护窗 -->
{#if showBoss}
  <button class="boss-veil" type="button" onclick={() => (showBoss = false)}>
    <span class="boss-screen">
      <h1>老板来了！</h1>
      <p>（假装工作/汇报，点击任意处离开）</p>
    </span>
  </button>
{/if}

<!-- 事件弹窗（队列逐个） -->
{#if $events.length > 0}
  <div class="modal">
    <div class="box">
      <p class="event-text">{$events[0].text}</p>
      <div class="actions"><button onclick={() => advanceEvent()}>下一步</button></div>
    </div>
  </div>
{/if}

<!-- 结算 -->
{#if $endResult}
  <div class="modal">
    <div class="box">
      <h2>结算</h2>
      {#if $endResult.score > 0}
        <p>得分：{$endResult.score} 元</p>
        {#if $endResult.message}<p>{$endResult.message}</p>{/if}
        {#if $endResult.entered}
          <label>你的名字：<input type="text" value={$endResult.name} onchange={(e) => setEndName(e.currentTarget.value)} /></label>
          <p>恭喜进入前 10（第 {$endResult.order + 1} 名）</p>
        {/if}
        <ol class="rank">
          {#each $endResult.top10 as h, i (i)}
            <li>{h.name} — {h.score}元（{h.fame}）</li>
          {/each}
        </ol>
      {:else}
        <p>{$endResult.message}</p>
      {/if}
      <div class="actions">
        <button onclick={() => startNewGame()}>再玩一把</button>
        <button onclick={() => (endResult.set(null))}>关闭</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sticky-top { position: sticky; top: 0; z-index: 9; }
  .topbar { position: relative; background: var(--fsj-accent); color: var(--fsj-title); display: flex; align-items: center; gap: 8px; padding: 6px 10px; overflow: hidden; }
  .topbar h1 { margin: 0; font-size: 1.05em; flex: 1; position: relative; z-index: 1; text-shadow: 1px 1px 2px #000; }
  .banner { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0.28; }
  .top-actions { position: relative; z-index: 1; display: flex; gap: 6px; }
  .statusbar { display: flex; flex-wrap: wrap; gap: 6px 8px; align-items: center; margin: 8px 6px; }
  .cell { display: inline-flex; align-items: center; gap: 3px; background: #0a0a0a; border: 1px solid #24262a; border-radius: 3px; padding: 2px 6px; }
  .lab { font-size: 0.82em; color: var(--fsj-dim); }
  .sl { color: var(--fsj-dim); }
  .loc-now { font-weight: 700; background: var(--fsj-accent); color: #fff; padding: 1px 6px; border-radius: 3px; }
  .core { flex: 1; min-height: 0; overflow: auto; display: block; padding: 0 4px 4px; }
  .pane { margin-bottom: 4px; background: var(--fsj-panel); border: 2px solid var(--fsj-border); border-radius: 6px; padding: 4px 6px; }
  .pane h2 { margin: 0 0 3px; font-size: 0.84em; color: var(--fsj-accent); border-bottom: 1px solid var(--fsj-border); padding-bottom: 2px; }
  .pane h2 { margin: 0 0 3px; font-size: 0.84em; color: var(--fsj-accent); border-bottom: 1px solid var(--fsj-border); padding-bottom: 2px; }
  .row { display: flex; align-items: center; gap: 5px; border-bottom: 1px dashed var(--fsj-border); padding: 2px 0; }
  .fillbar { position: relative; flex: 1; height: 32px; background: var(--fsj-panel2); border: 1px solid var(--fsj-border); border-radius: 4px; overflow: hidden; }
  .fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--fsj-accent); opacity: 0.4; }
  .label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 8px; pointer-events: none; font-size: 0.9em; }
  .label .nm { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%; }
  .label .inf { font-family: "Courier New", monospace; }
  .range { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
  .act { min-width: 42px; }
  .empty { color: var(--fsj-dim); padding: 4px 0; }
  .locrow { display: flex; align-items: center; justify-content: space-between; padding: 1px 6px; font-weight: 700; }
  .subsys-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); gap: 4px; }
  .subsys-grid button { min-height: 34px; font-size: 0.9em; padding: 2px 4px; }
  .boss { background: #d4b0b0; }
  .danger { background: #e0b0b0; color: #600; }
  .ticker { position: sticky; bottom: 0; z-index: 9; display: flex; align-items: center; background: #1a1a20; color: var(--fsj-ticker, #ffd400); font-size: 0.85em; overflow: hidden; }
  .ticker-title { background: var(--fsj-accent); color: #fff; padding: 2px 6px; font-size: 0.8em; }
  .ticker-track { white-space: nowrap; overflow: hidden; flex: 1; }
  .ticker-track span { display: inline-block; padding-left: 100%; animation: ticker 60s linear infinite; }
  @keyframes ticker { to { transform: translateX(-100%); } }
  .modal { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: grid; place-items: center; z-index: 20; padding: 12px; overflow: auto; }
  .box { background: var(--fsj-panel); border: 3px solid var(--fsj-border); border-radius: 8px; padding: 14px; max-width: 96vw; max-height: 86vh; overflow: auto; }
  .actions { display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end; flex-wrap: wrap; }
  .slider-row { display: flex; align-items: center; gap: 10px; }
  .slider-row input[type="range"] { flex: 1; }
  .dlg-label { white-space: pre-wrap; line-height: 1.4; }
  .event-text { white-space: pre-wrap; line-height: 1.5; }
  .loc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 8px 0; }
  .loc-grid button { padding: 12px; font-size: 1em; }
  .loc-grid button.active { background: var(--fsj-accent); color: #fff; }
  .rank { margin: 6px 0; padding-left: 1.2em; }
  .boss-veil { position: fixed; inset: 0; z-index: 30; background: #0a3050; display: grid; place-items: center; cursor: pointer; }
  .boss-screen { text-align: center; color: #f0f0b0; }
  .boss-screen h1 { font-size: 2.4em; margin: 0 0 8px; letter-spacing: 0.2em; }
  .boss-screen p { color: #cbd7e6; }
  @media (min-width: 760px) {
    .core { max-width: 760px; margin: 0 auto; width: 100%; }
  }
</style>
