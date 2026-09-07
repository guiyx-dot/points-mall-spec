import type { Screen } from '../types'
import { APPROVAL_RECORDS, DEMO_PHONE, GENERAL_FEE_RATE, type AdminScreen, type ApprovalDraft } from '../admin/model'
import type { Persisted } from '../store'
import { emptyState } from '../store'
import { addDays } from '../points-expiry'

export type PrdScene = {
  id: string
  group: string
  title: string
  kind: 'rules' | 'consumer' | 'admin'
  notes: string[]
  screen?: Screen
  adminScreen?: AdminScreen
  startPhone?: string
  draft?: ApprovalDraft
  seed?: Partial<Persisted>
}

const goldOrder = {
  id: 'ORD-PRD-GOLD',
  productId: 'gold',
  productName: '通用金',
  cost: 500,
  time: '9月7日 13:40',
  expireDate: addDays(90),
  status: 'completed' as const,
  received: 500,
  pointsPaid: 500,
}

const couponOrder = {
  id: 'ORD-PRD-ALIPAY',
  productId: 'alipay',
  productName: '支付宝通用券',
  cost: 500,
  time: '9月7日 13:42',
  expireDate: addDays(90),
  status: 'completed' as const,
  received: 500,
  pointsPaid: 500,
}

function afterGold(): Partial<Persisted> {
  const base = emptyState()
  return {
    points: base.points - 500,
    quotas: { ...base.quotas, gold: 0 },
    goldBalance: 500,
    orders: [goldOrder],
    ledger: [
      { id: 'L-gold', type: 'redeem', title: '兑换通用金', amount: -500, time: goldOrder.time },
      ...base.ledger,
    ],
  }
}

function afterCoupon(): Partial<Persisted> {
  const base = emptyState()
  return {
    points: base.points - 500,
    quotas: { ...base.quotas, alipay: 0 },
    coupons: [{ productId: 'alipay', name: '支付宝通用券', value: 500 }],
    orders: [couponOrder],
    ledger: [
      { id: 'L-alipay', type: 'redeem', title: '兑换支付宝通用券', amount: -500, time: couponOrder.time },
      ...base.ledger,
    ],
  }
}

const approvalDraft: ApprovalDraft = {
  recordId: APPROVAL_RECORDS[0].id,
  kind: 'general',
  merchantFeeRate: GENERAL_FEE_RATE,
  rows: APPROVAL_RECORDS[0].users,
  paid: false,
}

export const SCENES: PrdScene[] = [
  {
    id: 'rules',
    group: '先看规则',
    title: '本期要做什么',
    kind: 'rules',
    notes: [
      '在现有「权益 → 商品 → 配给商户 → 审批 → 充值支付」上，增加商品「通用积分」，费率 3%，全部商户承担。',
      '合规：不能把金/券发完就自动到账。先发积分，用户自己到积分商城兑成权益后再用。',
      '转型：希望用户去兑餐饮、出行等普通权益，而不是只拿类现金。专用券（通用金 / 支付宝券 / 微信立减金）仍走原来的权益商品。',
      '两套账不能混：专用券自有履约、无退款；通用积分走福多多，支持退货退款。商户后台「用户积分」「兑换订单」只记通用积分。',
      '1 积分 = 1 元。通用积分自发放成功日起 90 天有效，到期未使用的批次作废。',
      '本期只支持审批下单，不开放商品中心直采通用积分。',
    ],
  },
  {
    id: 'timing',
    group: '先看规则',
    title: '和福多多怎么对',
    kind: 'rules',
    notes: [
      '积分专区商品不是我方目录，是福多多同步过来的。用户兑换时系统要做两件事：扣用户账上的通用积分，以及通知福多多发货/发券。',
      '「扣积分的时序」就是这两步谁先谁后。如果先扣积分、福多多失败，用户积分没了货没到；如果福多多先成功、本地没扣成，货发出去了账没记。',
      '实现要求：福多多下单成功后再扣积分。若已经扣了但对方失败，必须把积分加回来。不要出现「积分扣了、货没发」。',
      '退款：不支持一笔订单退一部分（不能只退 50 积分里的 20）。可以退多笔不同订单，每笔都是整单退。退回的积分沿用原发放批次剩余有效期。',
      '专用券兑换不走福多多，兑完即结束，不能退。',
    ],
  },
  {
    id: 'approval',
    group: '商户后台',
    title: '审批记录 · 权益下单',
    kind: 'admin',
    adminScreen: 'approval',
    notes: [
      '主路径只有这一条：审批通过后，在记录上点「权益下单」。不要再走商品中心直接采购。',
      '点下单后先选「积分」，再选通用积分或专用券。专用券还要绑具体商品（通用金 / 支付宝券 / 微信立减金，一次一种）。',
      '名单来自审批导入，已含手机号。这个手机号 = C 端账号。',
    ],
  },
  {
    id: 'approval-buy',
    group: '商户后台',
    title: '选积分类型并下单',
    kind: 'admin',
    adminScreen: 'approval-buy',
    draft: approvalDraft,
    notes: [
      '通用积分：买新商品「通用积分」，费率 3%，不可拆给用户。发到手机号上的是通用积分，用户去积分专区兑福多多商品。',
      '专用券：仍买原来的权益商品，费率按合同（演示 8%），可在商户 / 用户之间拆，合计等于合同费率。发到手机号上的是只能兑这一种金/券的额度。',
      '体量按导入名单人数 × 每人体量，不是手填商品单价。收银台拆商品费和手续费，用已充值账户余额支付。',
    ],
  },
  {
    id: 'approval-pay',
    group: '商户后台',
    title: '收银台',
    kind: 'admin',
    adminScreen: 'approval-pay',
    draft: approvalDraft,
    notes: [
      '支付成功后积分立刻记到审批名单的手机号上，C 端打开就能花，没有「待领取」。',
      '通用积分入通用积分账户，专用券入对应专用额度。两本账不要写成一个余额字段。',
    ],
  },
  {
    id: 'members',
    group: '商户后台',
    title: '用户积分',
    kind: 'admin',
    adminScreen: 'members',
    notes: [
      '只展示通用积分。不要专用券、不要通用金、不要抵扣券、不要调账补发。',
      '列表：用户、通用积分、15 天内到期。点明细看发放批次和有效期至。',
      '支付成功即入账，所以没有待领取列。',
    ],
  },
  {
    id: 'members-detail',
    group: '商户后台',
    title: '用户积分 · 发放批次',
    kind: 'admin',
    adminScreen: 'members',
    startPhone: DEMO_PHONE,
    notes: [
      '每一笔发放自发放成功日起 90 天有效。多笔互不影响，先到期的先作废。',
      '15 天内到期用于提醒。已过期批次不能再兑。',
    ],
  },
  {
    id: 'redeems',
    group: '商户后台',
    title: '兑换订单',
    kind: 'admin',
    adminScreen: 'redeems',
    notes: [
      '只记通用积分兑换福多多商品的订单。专用券兑换不进这里。',
      '已完成可「退货退款」：整单退，积分退回该手机号，并通知福多多。不支持退订单里的一部分。',
      '多笔订单可以分别退、可以退多次。已退款订单不能再退。',
    ],
  },
  {
    id: 'member',
    group: 'C 端',
    title: '会员服务',
    kind: 'consumer',
    screen: { name: 'member' },
    notes: [
      '积分商城入口在专属福利上方。审批发放后积分已在账上，点进入就进商城，没有领取页。',
      '兑成通用金或券之后，从这里的「通用金 / 我的权益」进对应板块去使用。',
    ],
  },
  {
    id: 'mall',
    group: 'C 端',
    title: '积分商城',
    kind: 'consumer',
    screen: { name: 'mall' },
    notes: [
      '两个货架不能混兑。权益专区 = 专用券，一次把该商品剩余额度兑完，变成通用金或对应券。积分专区 = 福多多商品。',
      '积分专区支付一次只用一种：通用积分，或通用金，或一张券。不够就不能兑。',
      '顶部展示 90 天有效和最近到期日。',
    ],
  },
  {
    id: 'detail-gold',
    group: 'C 端',
    title: '兑专用券（通用金）',
    kind: 'consumer',
    screen: { name: 'detail', productId: 'gold' },
    notes: [
      '专用券按发放额度一次兑完。兑完即结束，不能退货退款。',
      '用户承担的费率从到账金额里扣。兑成后点「去使用」进通用金页。',
    ],
  },
  {
    id: 'success-gold',
    group: 'C 端',
    title: '兑完 · 去使用通用金',
    kind: 'consumer',
    screen: { name: 'success', orderId: 'ORD-PRD-GOLD' },
    seed: afterGold(),
    notes: [
      '兑换成功后主按钮是「去使用」，进通用金板块。返回商城也可以，之后在积分专区可用通用金支付。',
    ],
  },
  {
    id: 'gold-wallet',
    group: 'C 端',
    title: '通用金',
    kind: 'consumer',
    screen: { name: 'gold-wallet' },
    seed: afterGold(),
    notes: [
      '这是兑完通用金之后的使用页。转出仍走现网能力。余额可在积分专区当一种支付方式，按面值 1:1，不再加收商户手续费。',
    ],
  },
  {
    id: 'success-coupon',
    group: 'C 端',
    title: '兑完 · 去使用券',
    kind: 'consumer',
    screen: { name: 'success', orderId: 'ORD-PRD-ALIPAY' },
    seed: afterCoupon(),
    notes: [
      '兑支付宝券 / 微信立减金后，「去使用」进我的权益。之后在积分专区可选这张券支付。',
    ],
  },
  {
    id: 'rights',
    group: 'C 端',
    title: '我的权益',
    kind: 'consumer',
    screen: { name: 'my-benefits' },
    seed: afterCoupon(),
    notes: [
      '专用券兑成的卡券放这里。商户后台用户积分不展示这些。',
    ],
  },
  {
    id: 'detail-points',
    group: 'C 端',
    title: '兑福多多商品',
    kind: 'consumer',
    screen: { name: 'detail', productId: 'starbucks' },
    notes: [
      '积分专区下单：校验余额足够 → 福多多接单成功 → 再扣通用积分（或金/券）。失败要回滚，避免积分扣了货没发。',
      '这类订单会出现在商户后台兑换订单里，可以整单退货退款。',
    ],
  },
  {
    id: 'mine',
    group: 'C 端',
    title: '我的',
    kind: 'consumer',
    screen: { name: 'mine' },
    notes: [
      '看通用积分余额、90 天有效期、兑换记录和发放流水。没有待领取。',
    ],
  },
]
