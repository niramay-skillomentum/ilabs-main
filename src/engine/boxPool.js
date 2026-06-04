class BoxPool {

  constructor() {
    this.pool = [];
    this.counter = 0;
  }

  /* =========================
     NEW: AGE + BREAK EVALUATION
  ========================= */

  evaluateTrades() {

    const now = new Date();

    this.pool.forEach(trade => {

      // AGE CALCULATION
      const vd = new Date(trade.valueDate);
      const diffTime = now - vd;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      trade.age = diffDays;

      // ===== MO ESCALATION (NEW) =====
      const vdMinus1 = new Date(vd);
      vdMinus1.setDate(vd.getDate() - 1);

      if (
        trade.currentStatus === "MO_VALIDATION" &&
        now >= vdMinus1
      ) {
        trade.currentStatus = "MO_BREAK_OPEN";
      }

      // ===== CONFIRMATION ESCALATION =====
      if (
        trade.currentStatus === "CONFIRMATION_PENDING" &&
        now >= vd
      ) {
        trade.currentStatus = "CONFIRMATION_BREAK";
      }

      // ===== SETTLEMENT ESCALATION =====
      if (
        trade.currentStatus === "SETTLEMENT_PENDING" &&
        now > vd
      ) {
        trade.currentStatus = "SETTLEMENT_BREAK";
      }

    });

  }

  /* =========================
     EXISTING CODE (UNCHANGED)
  ========================= */

  generateRealisticAmount(currency) {
    let base;
    if (currency === "JPY") base = Math.random() * 10000000;
    else base = Math.random() * 2000000;

    const irregular = Math.floor(Math.random() * 997) + 3;
    return Math.floor(base / irregular) * irregular + Math.floor(Math.random() * 97);
  }

  ensureDeskLiquidity(desk, minimum = 20) {

    const deskTrades = this.pool.filter(t => t.nextDesk === desk);

    if (deskTrades.length >= minimum) return;

    const needed = minimum - deskTrades.length;

    const currencies = ["USD","EUR","GBP","JPY"];
    const counterparties = ["CITI","HSBC","DB","JPM","BNP"];
    const entities = ["GS London","GS New York","GS Singapore"];
    const regions = ["AMER","EMEA","APAC"];
    const products = ["FX","Equity","Derivatives"];
    const tradeTypes = ["OTC","Listed"];
    const settlementTypes = ["Electronic","Bilateral"];
    const directions = ["BUY","SELL"];

    for (let i = 0; i < needed; i++) {

      const now = new Date();
      const tradeDate = new Date(now);

      const currency = currencies[Math.floor(Math.random()*currencies.length)];
      const product = products[Math.floor(Math.random()*products.length)];

      let valueDate = new Date(now);

      // ✅ T+2 ENFORCEMENT
      valueDate.setDate(tradeDate.getDate() + 2);

      // 🔥 PRE-CALCULATE (SAFE)
      const baseAmount = this.generateRealisticAmount(currency);

      const isAmountBreak = Math.random() < 0.4;

      let bookingAmount = baseAmount;
      let truthAmount = baseAmount;

      if (isAmountBreak) {
        bookingAmount = baseAmount - 50000;
      }

      const trade = {

        tradeRef: "TRD_" + Date.now() + "_" + Math.random().toString(36).substring(2,8),
        originType: "AUTO_GENERATED",
        tradeDate,
        valueDate,
        nextDesk: desk,
        currentStatus: desk + "_PENDING",

        amount: bookingAmount,   // UI remains unchanged

        truth: {
          amount: truthAmount
        },

        booking: {
          amount: bookingAmount
        },

        currency,
        direction: directions[Math.floor(Math.random()*directions.length)],

        counterparty: counterparties[Math.floor(Math.random()*counterparties.length)],
        entity: entities[Math.floor(Math.random()*entities.length)],
        foRegion: regions[Math.floor(Math.random()*regions.length)],

        product,
        tradeType: tradeTypes[Math.floor(Math.random()*tradeTypes.length)],

        settlementType: settlementTypes[Math.floor(Math.random()*settlementTypes.length)],

        age: 0
      };

      this.pool.push(trade);
    }
  }

  addTrade(trade) { this.pool.push(trade); }
  addTrades(trades) { this.pool.push(...trades); }

  getTradesForDesk(desk) {
    this.ensureDeskLiquidity(desk,20);
    return this.pool.filter(t => t.nextDesk === desk);
  }

  removeTrade(tradeRef) {
    const index = this.pool.findIndex(t => t.tradeRef === tradeRef);
    if(index === -1) return null;
    const [trade] = this.pool.splice(index,1);
    return trade;
  }

  pullRandomTrades(desk,count){
    const deskTrades = this.getTradesForDesk(desk);
    if(deskTrades.length === 0) return [];

    const shuffled = [...deskTrades].sort(()=>0.5-Math.random());
    const selected = shuffled.slice(0,count);

    selected.forEach(trade=>{
      this.removeTrade(trade.tradeRef);
    });

    return selected;
  }

  returnTrade(trade){

    const index = this.pool.findIndex(t => t.tradeRef === trade.tradeRef);

    if (index !== -1) {
      this.pool[index] = trade;
    } else {
      this.pool.push(trade);
    }

  }

  getStats(){
    const stats = {};
    this.pool.forEach(trade=>{
      const desk = trade.nextDesk;
      if(!stats[desk]) stats[desk] = 0;
      stats[desk] += 1;
    });
    return stats;
  }

  viewPool(){ return this.pool; }

}

module.exports = new BoxPool();