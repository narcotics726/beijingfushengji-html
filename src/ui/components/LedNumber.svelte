<script lang="ts">
  // 七段 LED 液晶数字（复刻原版 StaticCounter 的绘制几何与「未点亮淡段+点亮亮段」）。
  // 段几何按 StaticCounter.cpp Draw() 的比例映射到 viewBox 0 0 49 105。
  let {
    value,
    lit = '#2ee22e', // 点亮颜色（绿）
    dim = '',        // 未点亮颜色；缺省 = lit/3（暗淡段，对应源码 foreground/3）
    height = 20,     // 单字高度(px)
  }: { value: number; lit?: string; dim?: string; height?: number } = $props()

  const SEG_ON: Record<string, string> = {
    '0': 'ABCDEF',
    '1': 'BC',
    '2': 'ABGED',
    '3': 'ABGCD',
    '4': 'FGBC',
    '5': 'AFGCD',
    '6': 'AFGEDC',
    '7': 'ABC',
    '8': 'ABCDEFG',
    '9': 'ABCDFG',
  }
  const SEG: Record<string, [number, number, number, number]> = {
    A: [14, 7, 35, 7],
    B: [42, 14, 42, 49],
    C: [42, 63, 42, 91],
    D: [14, 98, 35, 98],
    E: [7, 63, 7, 91],
    F: [7, 14, 7, 49],
    G: [14, 56, 35, 56],
  }
  function shade(hex: string, f: number): string {
    const n = parseInt(hex.slice(1), 16)
    const r = ((n >> 16) & 255) / f
    const g = ((n >> 8) & 255) / f
    const b = (n & 255) / f
    return `rgb(${r | 0},${g | 0},${b | 0})`
  }
  const off = $derived(dim || shade(lit, 3))
  const chars = $derived(String(Math.abs(Math.floor(value || 0))).split(''))
</script>

<div class="ledrow" style="height:{height}px">
  {#each chars as c, i}
    {@const on = SEG_ON[c] || ''}
    <svg viewBox="0 0 49 105" width={Math.round(height * 0.45)} height={height} aria-hidden="true">
      {#each Object.keys(SEG) as k}
        {@const [x1, y1, x2, y2] = SEG[k]}
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={on.includes(k) ? lit : off}
          stroke-width="7"
          stroke-linecap="round"
        />
      {/each}
    </svg>
  {/each}
</div>

<style>
  .ledrow { display: inline-flex; gap: 1px; align-items: center; }
  .ledrow svg { display: block; }
</style>
