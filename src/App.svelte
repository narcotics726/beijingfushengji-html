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
    rentAction,
    wangbaAction,
    airportAction,
    startNewGame,
    advanceEvent,
    exitGame,
    updateSettings,
  } from './ui/game'
  import { maxBuyQty } from './core/actions'
  import { GOODS } from './core/data/goods'
  import { LOCATIONS } from './core/data/locations'

  const g = $derived($game)

  let buyQty = $state<Record<number, number>>({})
  let sellQty = $state<Record<number, number>>({})
  let amountDlg = $state<null | { mode: 'deposit' | 'withdraw' | 'heal'; label: string; max: number }>(null)
  let amountValue = $state(1)
  let showSettings = $state(false)

  const marketGoods = $derived(GOODS.filter((x) => g.prices[x.id] > 0))
  const houseGoods = $derived(GOODS.filter((x) => g.holdings[x.id] > 0))

  function qv(map: Record<number, number>, id: number) {
    return map[id] ?? 1
  }
  // 原版买卖数量默认=最大；金钱/价格/持仓一变化（买/卖/过天/事件），即重算为当前可买/可卖上限
  $effect(() => {
    const gg = g
    for (const gd of marketGoods) {
      buyQty[gd.id] = Math.max(1, maxBuyQty(gg, gd.id))
    }
    for (const gd of houseGoods) {
      sellQty[gd.id] = Math.max(1, gg.holdings[gd.id])
    }
  })
  // 移动到新地点（过天）；数量由上面的 $effect 自动重算为新一天的最大
  function goTo(id: number) {
    moveToLoc(id)
  }
  function openAmount(mode: 'deposit' | 'withdraw' | 'heal', label: string, max: number) {
    amountDlg = { mode, label, max }
    amountValue = 1
  }
  function confirmAmount() {
    if (!amountDlg) return
    const v = Math.max(1, Math.min(amountDlg.max, Math.floor(amountValue)))
    const m = amountDlg.mode
    amountDlg = null
    if (m === 'deposit') bankDepositAction(v)
    else if (m === 'withdraw') bankWithdrawAction(v)
    else hospitalAction(v)
  }
</script>

<!-- 顶部标题 -->
<header>
  <h1>北京浮生({40 - g.timeLeft}/40天)</h1>
  <div class="head-btns">
    <button onclick={() => startNewGame()}>新游戏</button>
    <button onclick={() => (showSettings = true)}>设置</button>
    <button onclick={() => (amountDlg = null)}>关于</button>
  </div>
</header>

<div class="layout">
  <!-- 状态面板 -->
  <section class="status">
    <h2>我的状态</h2>
    <div class="stat-grid">
      <div class="stat">现金 <b class="pos">{g.cash}</b></div>
      <div class="stat">存款 <b>{g.bank}</b></div>
      <div class="stat">欠债 <b class="neg">{g.debt}</b></div>
      <div class="stat">健康 <b>{g.health}</b></div>
      <div class="stat">名声 <b class:red={g.fame < 60}>{g.fame}</b></div>
      <div class="stat">仓位 <b>{g.total}/{g.coat}</b></div>
    </div>
  </section>

  <!-- 黑市 -->
  <section class="panel market">
    <h2>地铁口黑市</h2>
    <ul>
      {#each marketGoods as good (good.id)}
        <li>
          <span class="name">{good.name}</span>
          <span class="price">{g.prices[good.id]} 元</span>
          <input type="number" min="1" max={maxBuyQty(g, good.id)} bind:value={buyQty[good.id]} />
          <button onclick={() => buyAction(good.id, qv(buyQty, good.id))}>买进</button>
        </li>
      {/each}
    </ul>
  </section>

  <!-- 出租屋 -->
  <section class="panel house">
    <h2>您在海淀的出租屋</h2>
    <ul>
      {#each houseGoods as good (good.id)}
        <li>
          <span class="name">{good.name}</span>
          <span class="price">进{g.holdCost[good.id]}元 ×{g.holdings[good.id]}</span>
          <input type="number" min="1" max={g.holdings[good.id]} bind:value={sellQty[good.id]} />
          <button onclick={() => sellAction(good.id, Math.min(qv(sellQty, good.id), g.holdings[good.id]))}>卖出</button>
        </li>
      {:else}
        <li class="empty">还没有货物。</li>
      {/each}
    </ul>
  </section>

  <!-- 北京地图：10 地点 -->
  <section class="panel map">
    <h2>北京地图</h2>
    <div class="loc-grid">
      {#each LOCATIONS as loc (loc.id)}
        <button class:active={g.loc === loc.id} onclick={() => goTo(loc.id)}>
          {loc.name}
        </button>
      {/each}
    </div>
  </section>
</div>

<!-- 底栏子系统按钮 -->
<footer class="actions">
  <button onclick={() => openAmount('deposit', '您存多少钱?', g.cash)}>银行</button>
  <button onclick={() => (amountDlg = { mode: 'heal', label: '需要治疗' + (100 - g.health) + '点(3500元/点)', max: 100 - g.health })}>医院</button>
  <button onclick={() => postOfficeAction()}>邮局</button>
  <button onclick={() => rentAction()}>租房</button>
  <button onclick={() => wangbaAction()}>网吧</button>
  <button onclick={() => airportAction()}>机场</button>
  <button class="danger" onclick={() => exitGame()}>离开</button>
</footer>

<!-- 金额 / 治疗对话框 -->
{#if amountDlg}
  <div class="modal">
    <div class="box">
      <p>{amountDlg.label}</p>
      <input type="number" min="1" max={amountDlg.max} bind:value={amountValue} />
      <div class="row">
        <button onclick={() => confirmAmount()}>确定</button>
        <button onclick={() => (amountDlg = null)}>取消</button>
      </div>
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
      <div class="row"><button onclick={() => (showSettings = false)}>关闭</button></div>
    </div>
  </div>
{/if}

<!-- 事件弹窗（队列逐个播放） -->
{#if $events.length > 0}
  <div class="modal">
    <div class="box">
      <p class="event-text">{($events[0]).text}</p>
      <div class="row">
        <button onclick={() => advanceEvent()}>下一步</button>
      </div>
    </div>
  </div>
{/if}

<!-- 结算 -->
{#if $endResult}
  <div class="modal">
    <div class="box">
      <h2>结算</h2>
      <p>得分：{$endResult.score} 元</p>
      <p>{$endResult.entered ? `恭喜进入前 10（第 ${$endResult.order + 1} 名）` : '未能进入前 10，下次努力!'}</p>
      <ol class="top10">
        {#each $endResult.top10 as h, i (i)}
          <li>{h.name} — {h.score}元（{h.fame}）</li>
        {/each}
      </ol>
      <div class="row">
        <button onclick={() => startNewGame()}>再玩一把</button>
        <button onclick={() => (endResult.set(null))}>关闭</button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(*) { box-sizing: border-box; }
  :global(body) { margin: 0; font-family: system-ui, sans-serif; background: #d9d0b8; color: #122; }
  .layout { display: grid; gap: 8px; padding: 8px; }
  header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #2b3a4a; color: #fff; }
  header h1 { margin: 0; font-size: 1.1em; }
  section, footer { background: #efe7d6; border: 2px solid #7a6e58; border-radius: 6px; padding: 8px; }
  h2 { margin: 0 0 6px; font-size: 0.95em; }
  .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
  .stat b { float: right; }
  .pos { color: #0a7a0a; }
  .neg, .red { color: #c00; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: flex; align-items: center; gap: 6px; padding: 3px 0; border-bottom: 1px dashed #c8bd9f; }
  li .name { flex: 1; }
  li .price { min-width: 5em; text-align: right; }
  li input { width: 3.2em; }
  li.empty { color: #777; }
  .loc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .loc-grid button { padding: 10px; font-size: 1em; border-radius: 6px; }
  .loc-grid button.active { background: #3c8; color: #fff; border-color: #287; }
  footer.actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 10px; }
  footer.actions button { padding: 12px; font-size: 1em; }
  button { cursor: pointer; }
  .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: grid; place-items: center; z-index: 10; }
  .box { background: #efe7d6; border: 3px solid #7a6e58; border-radius: 8px; padding: 14px; max-width: 92vw; max-height: 80vh; overflow: auto; }
  .row { display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end; }
  .row button { padding: 8px 14px; }
  .event-text { font-size: 1.05em; line-height: 1.5; white-space: pre-wrap; }
  .top10 { margin: 6px 0; padding-left: 1.2em; }
  @media (min-width: 760px) {
    .layout { grid-template-columns: 1fr 1fr; }
    .status, .map { grid-column: 1 / -1; }
    footer.actions { grid-template-columns: repeat(7, 1fr); }
  }
</style>
