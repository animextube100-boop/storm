import "./styles.css";


    /* -------------------------------------------------------------
       1. GLOBAL CONFIGURATION & SYSTEM CONSTANTS
    ------------------------------------------------------------- */
    const STORM_CONFIG = {
      API_BASE_URL: "https://storm-backend2.vercel.app",
      TOKEN_SYMBOL: "STORM",
      BLOCKCHAIN: "TON",
      // Single official receiving TON address for ALL payments:
      RECEIVING_ADDRESS: "UQCo0-D4DWT4Q99BJ35ONA7wduh_qtNwwpni55UyMhsFcY-x",
      CONTRACT_ADDRESS: "EQBsosmcZrD6FHijA7qWGLw5wo_aH8UN435hi935jJ_STORM",
      DEXSCREENER_API: "https://api.dexscreener.com/latest/dex/tokens/EQBsosmcZrD6FHijA7qWGLw5wo_aH8UN435hi935jJ_STORM",
      MIN_WITHDRAWAL_STORM: 5000,
      WITHDRAWAL_FEE_STORM: 300,
      MIN_VERIFIED_REFERRALS: 0,
      VERIFICATION_COST_TON: 0.5,
      INITIAL_MINING_DURATION_SEC: 8 * 3600, // 8 hours
      RESTART_MINING_DURATION_SEC: 6 * 3600  // 6 hours
    };

    /* -------------------------------------------------------------
       2. MINERS CATALOG (UPDATED SPEEDS: 15, 20, 25, 35, 50 STORM/HR)
    ------------------------------------------------------------- */
    const MINER_LIST = [
      {
        id: "basic",
        name: "Basic Miner",
        priceTon: 1.0,
        speed: 15.0,
        imgUrl: "https://i.ibb.co/JFbgZn02/Untitled-design-4.png"
      },
      {
        id: "advanced",
        name: "Advanced Miner",
        priceTon: 2.5,
        speed: 20.0,
        imgUrl: "https://i.ibb.co/TBHV5Xfp/Untitled-design-5.png"
      },
      {
        id: "pro",
        name: "Pro Miner",
        priceTon: 5.0,
        speed: 25.0,
        imgUrl: "https://i.ibb.co/gLLPYWR3/Untitled-design-6.png"
      },
      {
        id: "ultra",
        name: "Ultra Miner",
        priceTon: 10.0,
        speed: 35.0,
        imgUrl: "https://i.ibb.co/GNz8TK4/Untitled-design-7.png"
      },
      {
        id: "legendary",
        name: "Legendary Miner",
        priceTon: 25.0,
        speed: 50.0,
        imgUrl: "https://i.ibb.co/mC92QPtb/Untitled-design-8.png"
      }
    ];

    /* -------------------------------------------------------------
       3. REAL TASKS WITH UPDATED REWARDS (24H REPEATABLE)
    ------------------------------------------------------------- */
    const TASKS_LIST = [
      {
        id: "task_storm_channel",
        title: "Join STORM Official Channel",
        reward: 20,
        link: "https://t.me/STORM_NEWS_APP"
      },
      {
        id: "task_sponsor_channel",
        title: "Join Sponsor Channel",
        reward: 15,
        link: "https://t.me/CryptoClarity_News"
      },
      {
        id: "task_react_sponsor",
        title: "REACT on Latest Post (Sponsor)",
        reward: 20,
        link: "https://t.me/CryptoClarity_News"
      },
      {
        id: "task_react_storm",
        title: "REACT on Latest Post (STORM)",
        reward: 15,
        link: "https://t.me/STORM_NEWS_APP"
      }
    ];

    // Daily Spin Wheel (Guaranteed between 20 and 100 STORM)
    const SPIN_SEGMENTS = [
      { label: "20 STORM", value: 20, bg: "#15171C", text: "#FFD000" },
      { label: "30 STORM", value: 30, bg: "#FFD000", text: "#000000" },
      { label: "40 STORM", value: 40, bg: "#15171C", text: "#FFD000" },
      { label: "50 STORM", value: 50, bg: "#FFD000", text: "#000000" },
      { label: "60 STORM", value: 60, bg: "#15171C", text: "#FFD000" },
      { label: "75 STORM", value: 75, bg: "#FFD000", text: "#000000" },
      { label: "85 STORM", value: 85, bg: "#15171C", text: "#FFD000" },
      { label: "100 STORM", value: 100, bg: "#E6BC00", text: "#000000" }
    ];

    const STREAK_VALUES = [10, 15, 25, 35, 50, 75, 100];

    /* -------------------------------------------------------------
       4. STATE ARCHITECTURE
    ------------------------------------------------------------- */
    const DEFAULT_APP_STATE = {
      user: {
        id: "",
        name: "Miner",
        verified: false, // Verification is granted only after trusted review.
        savedTonWallet: ""
      },
      balances: {
        total: 0.000,
        available: 0.000,
        pendingMining: 0.000
      },
      mining: {
        isActive: false,
        startedAt: 0,
        durationSeconds: 8 * 3600, // 8 Hours initial
        baseSpeed: 10.0,
        extraSpeed: 0.0,
        sessionCount: 0,
        lastClaimTime: 0
      },
      streak: {
        currentDay: 1,
        lastClaimDate: ""
      },
      spinWheel: {
        lastSpinTimestamp: 0
      },
      teamMembers: [],
      completedTasks: {}, // Stores task completion timestamps: { [taskId]: timestamp }
      transactions: []
    };

    let AppState = JSON.parse(JSON.stringify(DEFAULT_APP_STATE));
    let liveTokenPriceUSD = null;
    let selectedMinerToBuy = null;
    let isSpinningWheel = false;
    let wheelRotationAngle = 0;
    let activePaymentRequest = null;
    let paymentCountdownInterval = null;
    let activePaymentKind = null;
    let serverApprovedPaymentIds = new Set();
    let paymentStatusSyncBusy = false;

    /* -------------------------------------------------------------
       5. STORAGE SYNCHRONIZATION
    ------------------------------------------------------------- */
    // Remove only the known seeded demo records from older saved states.
    // Real user progress and saved wallet details are retained.
    function cleanLegacyDemoData(state) {
      const cleaned = {
        ...JSON.parse(JSON.stringify(DEFAULT_APP_STATE)),
        ...(state || {}),
        user: { ...DEFAULT_APP_STATE.user, ...(state?.user || {}) },
        balances: { ...DEFAULT_APP_STATE.balances, ...(state?.balances || {}) },
        mining: { ...DEFAULT_APP_STATE.mining, ...(state?.mining || {}) },
        streak: { ...DEFAULT_APP_STATE.streak, ...(state?.streak || {}) },
        spinWheel: { ...DEFAULT_APP_STATE.spinWheel, ...(state?.spinWheel || {}) }
      };

      if (cleaned.user.id === "789123049") cleaned.user.id = "";
      if (cleaned.user.name === "StormMiner") cleaned.user.name = "Miner";

      // The original file preloaded 100 STORM into both balances. Remove that
      // seeded amount once when migrating the old v4 state.
      if (state && state._stormDemoSeedRemoved !== true) {
        cleaned.balances.total = Math.max(0, (Number(cleaned.balances.total) || 0) - 100);
        cleaned.balances.available = Math.max(0, (Number(cleaned.balances.available) || 0) - 100);
        cleaned._stormDemoSeedRemoved = true;
      }

      const demoReferralNames = new Set(["@ton_miner_pro", "@crypto_sam", "@whale_ton"]);
      cleaned.teamMembers = (Array.isArray(cleaned.teamMembers) ? cleaned.teamMembers : [])
        .filter(member => !demoReferralNames.has(member?.username));
      cleaned.transactions = (Array.isArray(cleaned.transactions) ? cleaned.transactions : [])
        .filter(tx => tx?.id !== "TX-VERIFY-INIT");
      cleaned.completedTasks = cleaned.completedTasks && typeof cleaned.completedTasks === "object"
        ? cleaned.completedTasks : {};

      return cleaned;
    }

    async function loadSavedState() {
      let raw = null;
      try {
        if (window.Telegram?.WebApp?.CloudStorage) {
          raw = await new Promise((resolve) => {
            window.Telegram.WebApp.CloudStorage.getItem("storm_state_v4", (err, val) => {
              resolve(!err && val ? val : null);
            });
          });
        }
      } catch (err) {}

      if (!raw) {
        try { raw = localStorage.getItem("storm_state_v4"); } catch (err) {}
      }

      if (raw) {
        try {
          AppState = cleanLegacyDemoData(JSON.parse(raw));
        } catch (err) {
          AppState = JSON.parse(JSON.stringify(DEFAULT_APP_STATE));
        }
      } else {
        AppState = JSON.parse(JSON.stringify(DEFAULT_APP_STATE));
      }

      recalculateHardwareSpeed();
      // Persist the cleaned state so the removed demo data does not return.
      persistState();
    }

    function persistState() {
      const serial = JSON.stringify(AppState);
      try {
        localStorage.setItem("storm_state_v4", serial);
        if (window.Telegram?.WebApp?.CloudStorage) {
          window.Telegram.WebApp.CloudStorage.setItem("storm_state_v4", serial, () => {});
        }
      } catch (err) {}
    }

    // Miner speed is granted only for payment request IDs approved by the backend.
    function recalculateHardwareSpeed() {
      let extra = 0;
      if (Array.isArray(AppState.transactions)) {
        AppState.transactions.forEach(t => {
          if (t.status === "APPROVED" && t.paymentRequestId &&
              serverApprovedPaymentIds.has(t.paymentRequestId) && t.minerSpeed) {
            extra += parseFloat(t.minerSpeed) || 0;
          }
        });
      }
      AppState.mining.extraSpeed = extra;
    }

    async function syncPaymentStatus(silent = true) {
      if (paymentStatusSyncBusy || !telegramInitData()) return;
      paymentStatusSyncBusy = true;
      try {
        const response = await fetch(`${STORM_CONFIG.API_BASE_URL}/payment-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ init_data: telegramInitData() }),
          cache: "no-store"
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          throw new Error(data.error || data.detail || "Could not sync payment status");
        }

        const previous = new Map((AppState.transactions || [])
          .filter(t => t.paymentRequestId)
          .map(t => [t.paymentRequestId, t.status]));

        serverApprovedPaymentIds = new Set((data.payments || [])
          .filter(p => ["approved", "verified"].includes(p.status) && p.payment_type !== "verification")
          .map(p => p.payment_request_id));
        AppState.user.verified = data.verified === true;

        (data.payments || []).forEach(payment => {
          const miner = MINER_LIST.find(m => m.id === payment.payment_type);
          const isVerification = payment.payment_type === "verification";
          if (!isVerification && !miner) return;
          const status = ["approved", "verified"].includes(payment.status) ? "APPROVED"
            : payment.status === "rejected" ? "REJECTED" : "PENDING";
          const amount = `${(Number(payment.amount_nano) / 1e9).toFixed(isVerification ? 1 : 2)} TON`;
          const tx = {
            id: (isVerification ? "VERIFY-" : "MINER-") + payment.payment_request_id.slice(0, 8),
            paymentRequestId: payment.payment_request_id,
            type: isVerification ? "0.5 TON Account Verification" : `Hardware: ${miner.name}`,
            ...(miner ? { minerId: miner.id, minerSpeed: miner.speed } : {}),
            amount,
            hash: payment.tx_hash || "",
            status,
            date: payment.created_at ? new Date(payment.created_at).toLocaleDateString() : ""
          };
          const index = AppState.transactions.findIndex(t => t.paymentRequestId === payment.payment_request_id);
          if (index >= 0) AppState.transactions[index] = tx;
          else AppState.transactions.unshift(tx);

          const oldStatus = previous.get(payment.payment_request_id);
          if (!silent && oldStatus === "PENDING" && status === "APPROVED") {
            showToast(isVerification ? "Account verification approved." : `${miner.name} approved and activated.`);
          } else if (!silent && oldStatus === "PENDING" && status === "REJECTED") {
            showToast("Payment request rejected. Contact support if needed.");
          }
        });

        recalculateHardwareSpeed();
        persistState();
        updateVerificationBadges();
        renderTxHistory();
        renderGlobalStats();
      } catch (error) {
        if (!silent) showToast(error.message || "Could not refresh payment status");
      } finally {
        paymentStatusSyncBusy = false;
      }
    }

    /* -------------------------------------------------------------
       6. TELEGRAM INTEGRATION & STARTUP
    ------------------------------------------------------------- */
    function initTelegramSDK() {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        try {
          tg.headerColor = "#0B0C0E";
          tg.backgroundColor = "#0B0C0E";
        } catch(e) {}

        if (tg.initDataUnsafe?.user) {
          const u = tg.initDataUnsafe.user;
          AppState.user.id = String(u.id);
          AppState.user.name = u.first_name || "Miner";
        }
      }

      document.getElementById("userNameTxt").textContent = AppState.user.name;
      document.getElementById("userIdTxt").textContent = `ID: ${AppState.user.id}`;
      document.getElementById("refLinkDisplay").textContent = `https://t.me/Mine_STORM_bot?start=ref_${AppState.user.id}`;

      document.getElementById("verifyReceivingAddress").textContent = STORM_CONFIG.RECEIVING_ADDRESS;
      document.getElementById("minerReceivingAddress").textContent = STORM_CONFIG.RECEIVING_ADDRESS;

      updateVerificationBadges();
      updateSavedWalletUI();
    }

    function updateVerificationBadges() {
      const badge = document.getElementById("userVerificationBadge");
      const unverifiedBox = document.getElementById("unverifiedNoticeBox");

      if (AppState.user.verified) {
        badge.className = "status-badge badge-verified";
        badge.textContent = "VERIFIED";
        unverifiedBox.style.display = "none";
      } else {
        badge.className = "status-badge badge-unverified";
        badge.textContent = "UNVERIFIED";
        unverifiedBox.style.display = "flex";
      }
    }

    /* -------------------------------------------------------------
       7. WALLET ADDRESS (DYNAMIC SAVE & DISCONNECT STATE)
    ------------------------------------------------------------- */
    function updateSavedWalletUI() {
      const inputWrap = document.getElementById("walletInputContainer");
      const savedWrap = document.getElementById("walletSavedContainer");
      const addrTxt = document.getElementById("savedWalletAddressText");

      if (AppState.user.savedTonWallet && AppState.user.savedTonWallet.trim() !== "") {
        inputWrap.style.display = "none";
        savedWrap.style.display = "block";
        addrTxt.textContent = AppState.user.savedTonWallet;
      } else {
        inputWrap.style.display = "block";
        savedWrap.style.display = "none";
        document.getElementById("manualWalletInput").value = "";
      }
    }

    function saveManualWallet() {
      const val = document.getElementById("manualWalletInput").value.trim();
      if (!val || val.length < 24) {
        showToast("Enter a valid TON address (UQ... / EQ...)");
        return;
      }
      AppState.user.savedTonWallet = val;
      persistState();
      updateSavedWalletUI();
      showToast("TON Wallet saved!");
    }

    function disconnectWallet() {
      AppState.user.savedTonWallet = "";
      persistState();
      updateSavedWalletUI();
      showToast("Wallet disconnected");
    }

    /* -------------------------------------------------------------
       8. DEXSCREENER LIVE PRICE (USD ONLY - NO INR)
    ------------------------------------------------------------- */
    async function fetchDexScreenerPrice(manual = false) {
      const priceTxt = document.getElementById("liveTokenPriceDisplay");
      const changeTxt = document.getElementById("livePriceChangeDisplay");
      const timeTxt = document.getElementById("priceTimestampDisplay");

      if (manual) priceTxt.textContent = "Checking...";

      try {
        const res = await fetch(STORM_CONFIG.DEXSCREENER_API, { cache: "no-store" });
        if (!res.ok) throw new Error("DexScreener Offline");
        const json = await res.json();

        if (json.pairs && json.pairs.length > 0) {
          const tonPair = json.pairs.find(p => p.chainId === "ton") || json.pairs[0];
          if (tonPair && tonPair.priceUsd) {
            liveTokenPriceUSD = parseFloat(tonPair.priceUsd);
            const change24h = parseFloat(tonPair.priceChange?.h24 || 0);

            priceTxt.textContent = `$${liveTokenPriceUSD.toFixed(6)}`;
            changeTxt.textContent = `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`;
            changeTxt.style.color = change24h >= 0 ? "var(--color-success)" : "var(--color-danger)";
            timeTxt.textContent = new Date().toLocaleTimeString();
            recalculateUSD();
            return;
          }
        }
        setPriceUnavailable("No liquid pool");
      } catch (err) {
        setPriceUnavailable("Price unavailable");
      }
    }

    function setPriceUnavailable(msg) {
      liveTokenPriceUSD = null;
      document.getElementById("liveTokenPriceDisplay").textContent = msg;
      document.getElementById("livePriceChangeDisplay").textContent = "--";
      document.getElementById("livePriceChangeDisplay").style.color = "var(--text-dim)";
      recalculateUSD();
    }

    function recalculateUSD() {
      const total = AppState.balances.total;
      const usdEl = document.getElementById("homeFiatUSD");

      if (liveTokenPriceUSD !== null && !isNaN(liveTokenPriceUSD)) {
        const totalUsd = total * liveTokenPriceUSD;
        usdEl.textContent = `$${totalUsd.toFixed(2)}`;
      } else {
        usdEl.textContent = "$--";
      }
    }

    /* -------------------------------------------------------------
       9. MINING RIG LOGIC (8H INITIAL -> CLAIM -> AUTO 6H)
    ------------------------------------------------------------- */
    function getTotalMiningSpeed() {
      return AppState.mining.baseSpeed + AppState.mining.extraSpeed;
    }

    function handleStartMiningClick() {
      if (!AppState.user.verified) {
        showToast("Verification required! Pay 0.5 TON to unlock.");
        openVerificationModal();
        return;
      }

      if (AppState.mining.isActive) return;

      AppState.mining.isActive = true;
      AppState.mining.startedAt = Date.now();
      // First session: 8 hours
      AppState.mining.durationSeconds = STORM_CONFIG.INITIAL_MINING_DURATION_SEC;
      AppState.mining.sessionCount = 1;
      persistState();

      showToast("8-Hour Mining started! ⚡");
      renderMiningView();
    }

    function updateMiningTimer() {
      const statusLabel = document.getElementById("miningRigStatusLabel");
      const countdown = document.getElementById("miningCountdownTimer");
      const progressBar = document.getElementById("miningProgressFillBar");
      const yieldAccumulated = document.getElementById("miningAccumulatedVal");
      const btnStart = document.getElementById("btnStartMiningRig");
      const btnClaim = document.getElementById("btnClaimMiningYield");
      const cycleLabel = document.getElementById("miningCycleLabel");

      const currentDuration = AppState.mining.durationSeconds || STORM_CONFIG.INITIAL_MINING_DURATION_SEC;
      const durationHours = Math.round(currentDuration / 3600);

      if (!AppState.mining.isActive) {
        statusLabel.textContent = "STATUS: INACTIVE";
        statusLabel.style.color = "var(--text-muted)";
        countdown.textContent = String(durationHours).padStart(2, "0") + ":00:00";
        progressBar.style.width = "0%";
        yieldAccumulated.textContent = "0.000";
        btnStart.style.display = "flex";
        btnStart.textContent = `Start ${durationHours}H Mining`;
        btnClaim.style.display = "none";
        cycleLabel.textContent = `Cycle Length: ${durationHours} Hours`;
        return;
      }

      const elapsedMs = Date.now() - AppState.mining.startedAt;
      const totalDurationMs = currentDuration * 1000;
      const currentProgress = Math.min(1, elapsedMs / totalDurationMs);

      // Hourly accumulated yield
      const hoursElapsed = Math.min(durationHours, elapsedMs / 3600000);
      const accumulated = hoursElapsed * getTotalMiningSpeed();
      AppState.balances.pendingMining = accumulated;

      yieldAccumulated.textContent = accumulated.toFixed(3);
      progressBar.style.width = `${(currentProgress * 100).toFixed(1)}%`;
      document.getElementById("homePendingBalance").textContent = accumulated.toFixed(3);

      const remainSec = Math.max(0, Math.floor((totalDurationMs - elapsedMs) / 1000));
      const hh = String(Math.floor(remainSec / 3600)).padStart(2, "0");
      const mm = String(Math.floor((remainSec % 3600) / 60)).padStart(2, "0");
      const ss = String(remainSec % 60).padStart(2, "0");
      countdown.textContent = `${hh}:${mm}:${ss}`;

      if (elapsedMs >= totalDurationMs) {
        statusLabel.textContent = "STATUS: 8H FINISHED (CLAIM TO START 6H)";
        statusLabel.style.color = "var(--color-success)";
        btnStart.style.display = "none";
        btnClaim.style.display = "flex";
        cycleLabel.textContent = "Session ended. Claim rewards to automatically start 6H session!";
      } else {
        statusLabel.textContent = `STATUS: ACTIVE MINING (${durationHours}H SESSION)`;
        statusLabel.style.color = "var(--gold-primary)";
        btnStart.style.display = "none";
        btnClaim.style.display = "none";
        cycleLabel.textContent = `Mining session runs for ${durationHours}H. Next session: 6H`;
      }
    }

    function handleClaimMiningClick() {
      const reward = AppState.balances.pendingMining;
      if (reward <= 0) {
        showToast("No rewards to claim yet");
        return;
      }

      // Add rewards to balances
      AppState.balances.total += reward;
      AppState.balances.available += reward;
      AppState.balances.pendingMining = 0;
      AppState.mining.lastClaimTime = Date.now();

      // AUTOMATICALLY RESTART FOR 6 HOURS!
      AppState.mining.isActive = true;
      AppState.mining.startedAt = Date.now();
      AppState.mining.durationSeconds = STORM_CONFIG.RESTART_MINING_DURATION_SEC; // 6 hours
      AppState.mining.sessionCount = (AppState.mining.sessionCount || 0) + 1;

      persistState();
      showToast(`Claimed +${reward.toFixed(3)} STORM! Auto-started 6H session ⚡`);
      renderGlobalStats();
      renderMiningView();
    }

    /* -------------------------------------------------------------
       10. 0.5 TON VERIFICATION & MANUAL ON-CHAIN PAYMENT
    ------------------------------------------------------------- */
    function copyCentralAddress() {
      navigator.clipboard.writeText(STORM_CONFIG.RECEIVING_ADDRESS);
      showToast("Receiving TON address copied!");
    }

    function telegramInitData() {
      return window.Telegram?.WebApp?.initData || "";
    }

    async function createPaymentSession(paymentType, kind) {
      const initData = telegramInitData();
      if (!initData) {
        showToast("Open STORM inside Telegram to create a payment request.");
        return;
      }
      activePaymentRequest = null;
      activePaymentKind = kind;
      clearInterval(paymentCountdownInterval);
      const ids = kind === "verification"
        ? ["verifyPaymentCountdown", "verifyPaymentAmount", "verifyPaymentHint"]
        : ["minerPaymentCountdown", "minerPaymentAmount", "minerPaymentHint"];
      const [countdownEl, amountEl, hintEl] = ids.map(id => document.getElementById(id));
      countdownEl.textContent = "Creating...";
      hintEl.textContent = "Connecting to the STORM payment server. Wait for the address and timer.";

      try {
        const response = await fetch(`${STORM_CONFIG.API_BASE_URL}/create-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ init_data: initData, payment_type: paymentType })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || data.detail || "Could not create payment request");
        activePaymentRequest = {
          id: data.payment_request_id,
          paymentType,
          kind,
          expiresAt: Date.parse(data.expires_at)
        };
        STORM_CONFIG.RECEIVING_ADDRESS = data.destination_address;
        document.getElementById("verifyReceivingAddress").textContent = data.destination_address;
        document.getElementById("minerReceivingAddress").textContent = data.destination_address;
        amountEl.textContent = `${Number(data.amount_ton).toFixed(paymentType === "verification" ? 1 : 2)} TON`;
        hintEl.textContent = "Send the exact amount to this address, then paste the transaction hash from your wallet history.";
        updatePaymentCountdown();
        paymentCountdownInterval = setInterval(updatePaymentCountdown, 1000);
      } catch (error) {
        countdownEl.textContent = "Not created";
        hintEl.textContent = error.message || "Payment server unavailable. Try again.";
        showToast(error.message || "Could not create payment request");
      }
    }

    function updatePaymentCountdown() {
      if (!activePaymentRequest) return;
      const remaining = Math.max(0, Math.ceil((activePaymentRequest.expiresAt - Date.now()) / 1000));
      const id = activePaymentRequest.kind === "verification" ? "verifyPaymentCountdown" : "minerPaymentCountdown";
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = remaining > 0
        ? `${String(Math.floor(remaining / 60)).padStart(2,"0")}:${String(remaining % 60).padStart(2,"0")} LEFT`
        : "EXPIRED";
      if (remaining <= 0) {
        clearInterval(paymentCountdownInterval);
        activePaymentRequest = null;
      }
    }

    async function verifyPaymentHash(inputId, kind) {
      const hash = document.getElementById(inputId).value.trim();
      if (!hash) { showToast("Paste the transaction hash from your TON wallet."); return null; }
      if (!telegramInitData()) { showToast("Open STORM inside Telegram to verify payment."); return null; }
      if (!activePaymentRequest || activePaymentRequest.kind !== kind) {
        showToast("Payment request missing or expired. Close and reopen this payment.");
        return null;
      }
      if (Date.now() > activePaymentRequest.expiresAt) {
        clearInterval(paymentCountdownInterval);
        activePaymentRequest = null;
        showToast("4-minute payment window expired. Create a new request.");
        return null;
      }

      const buttonSelector = kind === "verification"
        ? '#verificationModal button[onclick="submitVerificationPayment()"]'
        : '#minerBuyModal button[onclick="submitMinerPurchase()"]';
      const button = document.querySelector(buttonSelector);
      if (button) { button.disabled = true; button.textContent = "VERIFYING..."; }
      try {
        const response = await fetch(`${STORM_CONFIG.API_BASE_URL}/verify-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            init_data: telegramInitData(),
            payment_request_id: activePaymentRequest.id,
            tx_hash: hash
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok || data.status !== "awaiting_admin" || !data.pending) {
          throw new Error(data.error || data.detail || "Could not submit payment for admin review");
        }
        clearInterval(paymentCountdownInterval);
        activePaymentRequest = null;
        return data;
      } catch (error) {
        showToast(error.message || "Verification failed. Check the hash and try again.");
        return null;
      } finally {
        if (button) { button.disabled = false; button.textContent = kind === "verification" ? "Verify Payment" : "Verify Purchase"; }
      }
    }

    function openVerificationModal() {
      document.getElementById("verifyTxHashInput").value = "";
      document.getElementById("verificationModal").classList.add("show");
      createPaymentSession("verification", "verification");
    }

    async function submitVerificationPayment() {
      const result = await verifyPaymentHash("verifyTxHashInput", "verification");
      if (!result) return;
      AppState.transactions.unshift({
        id: "VERIFY-" + result.payment_request_id.slice(0, 8),
        paymentRequestId: result.payment_request_id,
        type: "0.5 TON Account Verification",
        amount: "0.5 TON",
        hash: result.tx_hash,
        status: "PENDING",
        date: new Date().toLocaleDateString()
      });
      persistState();
      closeModal("verificationModal");
      renderTxHistory();
      showToast("Payment submitted. Verification is pending admin approval.");
      syncPaymentStatus(true);
    }

    /* -------------------------------------------------------------
       11. MINER SHOP (PHOTOS + SPEED ADDED ON PURCHASE)
    ------------------------------------------------------------- */
    function renderMinersShop() {
      const box = document.getElementById("minerCardsContainer");
      box.innerHTML = "";

      MINER_LIST.forEach(miner => {
        const div = document.createElement("div");
        div.className = "miner-card";
        div.innerHTML = `
          <div style="display:flex; align-items:center; gap:12px;">
            <div class="miner-photo-box">
              <img src="${miner.imgUrl}" alt="${miner.name}" class="miner-photo-img" onerror="this.src='https://i.ibb.co/k6qLHqDw/file-00000000ad5882108932c3d8a1393bd1.jpg'" />
            </div>
            <div>
              <div style="font-weight:800; font-size:14px;">${miner.name}</div>
              <div style="font-size:11px; color:var(--gold-primary); font-weight:700;">+${miner.speed} STORM / hr</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:15px; font-weight:900; color:var(--gold-primary); margin-bottom:4px;">${miner.priceTon} TON</div>
            <button class="btn-3d" style="padding:6px 14px; font-size:11px;" onclick="openMinerBuyModal('${miner.id}')">
              Purchase
            </button>
          </div>
        `;
        box.appendChild(div);
      });
    }

    function openMinerBuyModal(minerId) {
      const miner = MINER_LIST.find(m => m.id === minerId);
      if (!miner) return;
      selectedMinerToBuy = miner;

      document.getElementById("buyMinerTitle").textContent = `Buy ${miner.name}`;
      document.getElementById("buyMinerPriceTon").textContent = `${miner.priceTon} TON (+${miner.speed} STORM/h)`;
      document.getElementById("minerTxHashInput").value = "";
      document.getElementById("minerBuyModal").classList.add("show");
      createPaymentSession(miner.id, "miner");
    }

    async function submitMinerPurchase() {
      if (!selectedMinerToBuy) return;
      const miner = selectedMinerToBuy;
      const result = await verifyPaymentHash("minerTxHashInput", "miner");
      if (!result) return;
      AppState.transactions.unshift({
        id: "MINER-" + result.payment_request_id.slice(0, 8),
        paymentRequestId: result.payment_request_id,
        type: `Hardware: ${miner.name}`,
        minerId: miner.id,
        minerSpeed: miner.speed,
        amount: `${miner.priceTon} TON`,
        hash: result.tx_hash,
        status: "PENDING",
        date: new Date().toLocaleDateString()
      });
      persistState();
      closeModal("minerBuyModal");
      renderTxHistory();
      showToast("Purchase submitted. Miner activates after admin approval.");
      syncPaymentStatus(true);
    }

    /* -------------------------------------------------------------
       12. REAL TASKS (EVERY 24 HOURS COMPLETION)
    ------------------------------------------------------------- */
    function renderTasks() {
      const box = document.getElementById("tasksCardsContainer");
      box.innerHTML = "";
      const now = Date.now();

      TASKS_LIST.forEach(task => {
        const lastDoneTime = AppState.completedTasks[task.id] || 0;
        const diff = now - lastDoneTime;
        const isEligible = (lastDoneTime === 0) || (diff >= 86400000);

        let buttonHtml = "";
        let timerText = "";

        if (isEligible) {
          buttonHtml = `<button class="btn-3d" style="padding:6px 14px; font-size:11px;" onclick="triggerTask('${task.id}')">Start</button>`;
          timerText = `<span style="color:var(--color-success); font-weight:700;">Ready to Claim</span>`;
        } else {
          const remainMs = 86400000 - diff;
          const hh = Math.floor(remainMs / 3600000);
          const mm = Math.floor((remainMs % 3600000) / 60000);
          buttonHtml = `<button class="btn-3d-secondary" style="border-color:var(--color-success); color:var(--color-success);" disabled>DONE</button>`;
          timerText = `<span style="color:var(--text-dim);">Reset in ${hh}h ${mm}m</span>`;
        }

        const item = document.createElement("div");
        item.className = "task-item";
        item.innerHTML = `
          <div>
            <div style="font-weight:700; font-size:13px;">${task.title}</div>
            <div style="font-size:11px; color:var(--gold-primary); font-weight:800; margin-top:2px;">
              +${task.reward} STORM • ${timerText}
            </div>
          </div>
          <div>${buttonHtml}</div>
        `;
        box.appendChild(item);
      });
    }

    function triggerTask(taskId) {
      const task = TASKS_LIST.find(t => t.id === taskId);
      if (!task) return;

      const lastDoneTime = AppState.completedTasks[taskId] || 0;
      if (lastDoneTime > 0 && (Date.now() - lastDoneTime < 86400000)) {
        showToast("Task completed already today! Resets in 24 hours.");
        return;
      }

      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(task.link);
      } else {
        window.open(task.link, "_blank");
      }

      showToast("Verifying task completion...");

      setTimeout(() => {
        AppState.completedTasks[taskId] = Date.now();
        AppState.balances.total += task.reward;
        AppState.balances.available += task.reward;
        persistState();
        showToast(`Task Complete! +${task.reward} STORM`);
        renderGlobalStats();
        renderTasks();
      }, 3500);
    }

    function drawWheelCanvas() {
      const canvas = document.getElementById("wheelCanvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const count = SPIN_SEGMENTS.length;
      const arc = (2 * Math.PI) / count;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = cx - 10;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < count; i++) {
        const angle = i * arc;
        ctx.beginPath();
        ctx.fillStyle = SPIN_SEGMENTS[i].bg;
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, angle, angle + arc);
        ctx.lineTo(cx, cy);
        ctx.fill();

        ctx.strokeStyle = "#262A34";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = SPIN_SEGMENTS[i].text;
        ctx.font = "bold 22px " + getComputedStyle(document.body).fontFamily;
        ctx.fillText(SPIN_SEGMENTS[i].label, r - 20, 8);
        ctx.restore();
      }
    }

    function updateSpinCountdown() {
      const btn = document.getElementById("btnTriggerSpin");
      const label = document.getElementById("spinTimerTxt");
      const last = AppState.spinWheel.lastSpinTimestamp || 0;
      const diff = Date.now() - last;
      const cooldown = 86400000;

      if (diff >= cooldown) {
        label.textContent = "Ready";
        label.style.color = "var(--gold-primary)";
        if (!isSpinningWheel) btn.disabled = false;
      } else {
        btn.disabled = true;
        const remain = cooldown - diff;
        const hh = String(Math.floor(remain / 3600000)).padStart(2, "0");
        const mm = String(Math.floor((remain % 3600000) / 60000)).padStart(2, "0");
        const ss = String(Math.floor((remain % 60000) / 1000)).padStart(2, "0");
        label.textContent = `${hh}:${mm}:${ss}`;
        label.style.color = "var(--text-muted)";
      }
    }

    function handleSpinWheelClick() {
      const last = AppState.spinWheel.lastSpinTimestamp || 0;
      if (Date.now() - last < 86400000 || isSpinningWheel) return;

      isSpinningWheel = true;
      document.getElementById("btnTriggerSpin").disabled = true;

      const chosenIndex = Math.floor(Math.random() * SPIN_SEGMENTS.length);
      const chosenPrize = SPIN_SEGMENTS[chosenIndex];

      const segmentAngle = 360 / SPIN_SEGMENTS.length;
      const stopDegree = (360 - (chosenIndex * segmentAngle) - (segmentAngle / 2) + 270) % 360;
      const fullTurns = 360 * 5;
      wheelRotationAngle += fullTurns + (stopDegree - (wheelRotationAngle % 360));

      const canvas = document.getElementById("wheelCanvas");
      canvas.style.transform = `rotate(${wheelRotationAngle}deg)`;

      setTimeout(() => {
        isSpinningWheel = false;
        AppState.spinWheel.lastSpinTimestamp = Date.now();
        AppState.balances.total += chosenPrize.value;
        AppState.balances.available += chosenPrize.value;

        persistState();
        showToast(`🎉 You won ${chosenPrize.value} STORM!`);
        renderGlobalStats();
        updateSpinCountdown();
      }, 4200);
    }

    /* -------------------------------------------------------------
       13. 7-DAY LOGIN STREAK
    ------------------------------------------------------------- */
    function renderStreakCalendar() {
      const grid = document.getElementById("streakCellsContainer");
      grid.innerHTML = "";
      const current = AppState.streak.currentDay;
      const todayStr = new Date().toDateString();
      const claimedToday = AppState.streak.lastClaimDate === todayStr;

      const btn = document.getElementById("btnCheckInDaily");
      btn.disabled = claimedToday;
      btn.textContent = claimedToday ? "Claimed" : "Check In";

      for (let i = 1; i <= 7; i++) {
        const isPastClaimed = i < current || (i === current && claimedToday);
        const isToday = i === current;
        const cell = document.createElement("div");
        cell.className = `streak-day-cell ${isPastClaimed ? "claimed" : ""} ${isToday ? "today" : ""}`;
        cell.innerHTML = `
          <div style="font-size:9px; color:var(--text-dim);">D${i}</div>
          <div style="margin-top:2px;">+${STREAK_VALUES[i-1]}</div>
        `;
        grid.appendChild(cell);
      }
    }

    function claimDailyStreakReward() {
      const todayStr = new Date().toDateString();
      if (AppState.streak.lastClaimDate === todayStr) {
        showToast("Already claimed today!");
        return;
      }

      const reward = STREAK_VALUES[AppState.streak.currentDay - 1] || 10;
      AppState.balances.total += reward;
      AppState.balances.available += reward;
      AppState.streak.lastClaimDate = todayStr;

      if (AppState.streak.currentDay >= 7) {
        AppState.streak.currentDay = 1;
      } else {
        AppState.streak.currentDay += 1;
      }

      persistState();
      showToast(`Login Bonus: +${reward} STORM`);
      renderGlobalStats();
      renderStreakCalendar();
    }

    /* -------------------------------------------------------------
       14. FULL TEAM SECTION (REFERRAL STATS & 10% COMMISSIONS)
    ------------------------------------------------------------- */
    function copyReferralLink() {
      const link = document.getElementById("refLinkDisplay").textContent;
      navigator.clipboard.writeText(link);
      showToast("Referral link copied!");
    }

    function shareReferralLink() {
      const link = document.getElementById("refLinkDisplay").textContent;
      const text = encodeURIComponent("Join my STORM Mining Syndicate on TON! ⚡");
      const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`;
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(url);
      } else {
        window.open(url, "_blank");
      }
    }

    function renderTeamSection() {
      const totalCount = AppState.teamMembers.length;
      const verifiedMembers = AppState.teamMembers.filter(m => m.verified);
      const verifiedCount = verifiedMembers.length;

      // 10% reward from all verified referrals' earnings
      let commissionEarned = 0;
      verifiedMembers.forEach(m => {
        commissionEarned += (m.earnings * 0.10);
      });

      document.getElementById("teamTotalCount").textContent = totalCount;
      document.getElementById("teamVerifiedCount").textContent = verifiedCount;
      document.getElementById("teamTotalEarnings").textContent = commissionEarned.toFixed(2);

      const listContainer = document.getElementById("teamMembersListContainer");
      listContainer.innerHTML = "";

      if (AppState.teamMembers.length === 0) {
        listContainer.innerHTML = `<div style="font-size:12px; color:var(--text-dim); text-align:center; padding:12px;">No team members yet. Share your invite link!</div>`;
        return;
      }

      AppState.teamMembers.forEach(member => {
        const row = document.createElement("div");
        row.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface); padding:10px 12px; border-radius:var(--radius-md); border:1px solid var(--border-color); font-size:12px;";
        
        const badgeHtml = member.verified 
          ? `<span class="status-badge badge-verified">VERIFIED</span>`
          : `<span class="status-badge badge-unverified">UNVERIFIED</span>`;

        const bonus = member.verified ? (member.earnings * 0.10).toFixed(1) : "0.0";

        row.innerHTML = `
          <div>
            <div style="font-weight:700;">${member.username}</div>
            <div style="font-size:10px; color:var(--text-dim); margin-top:2px;">Joined: ${member.date}</div>
          </div>
          <div style="text-align:right;">
            <div style="margin-bottom:3px;">${badgeHtml}</div>
            <div style="font-size:11px; font-weight:700; color:var(--gold-primary);">+${bonus} STORM (10%)</div>
          </div>
        `;
        listContainer.appendChild(row);
      });
    }

    /* -------------------------------------------------------------
       15. WITHDRAWALS (MIN 5000 STORM & 300 FEE)
    ------------------------------------------------------------- */
    function updateWithdrawalEligibilityUI() {
      const statusText = document.getElementById("withdrawEligibilityText");
      const avail = AppState.balances.available;

      if (avail < STORM_CONFIG.MIN_WITHDRAWAL_STORM) {
        statusText.textContent = `Min. ${STORM_CONFIG.MIN_WITHDRAWAL_STORM} STORM required`;
        statusText.style.color = "var(--color-danger)";
      } else {
        statusText.textContent = "ELIGIBLE";
        statusText.style.color = "var(--color-success)";
      }
    }

    function updateWithdrawalBreakdown() {
      const input = document.getElementById("inputWithdrawAmount");
      const netText = document.getElementById("modalNetPayoutText");
      const val = parseFloat(input.value) || 0;
      const net = Math.max(0, val - STORM_CONFIG.WITHDRAWAL_FEE_STORM);
      netText.textContent = `${net.toFixed(2)} STORM`;
    }

    function openWithdrawModal() {
      const verifiedCount = AppState.teamMembers.filter(m => m.verified).length;

      if (AppState.balances.available < STORM_CONFIG.MIN_WITHDRAWAL_STORM) {
        showToast(`Minimum withdrawal is ${STORM_CONFIG.MIN_WITHDRAWAL_STORM} STORM`);
        return;
      }
      document.getElementById("modalWithdrawAvailable").textContent = `${AppState.balances.available.toFixed(3)} STORM`;
      document.getElementById("inputWithdrawAmount").value = STORM_CONFIG.MIN_WITHDRAWAL_STORM;
      updateWithdrawalBreakdown();
      document.getElementById("inputWithdrawDestination").value = AppState.user.savedTonWallet || "";
      document.getElementById("withdrawModal").classList.add("show");
    }

    function submitWithdrawalForm() {
      const amount = parseFloat(document.getElementById("inputWithdrawAmount").value);
      const address = document.getElementById("inputWithdrawDestination").value.trim();

      if (isNaN(amount) || amount < STORM_CONFIG.MIN_WITHDRAWAL_STORM) {
        showToast(`Minimum withdrawal is ${STORM_CONFIG.MIN_WITHDRAWAL_STORM} STORM`);
        return;
      }
      if (amount > AppState.balances.available) {
        showToast("Amount exceeds available balance");
        return;
      }
      if (!address || address.length < 24) {
        showToast("Enter a valid TON recipient address");
        return;
      }

      const netPayout = amount - STORM_CONFIG.WITHDRAWAL_FEE_STORM;
      if (netPayout <= 0) {
        showToast("Withdrawal amount must exceed the 300 STORM fee");
        return;
      }

      // Deduct balance including fee
      AppState.balances.total -= amount;
      AppState.balances.available -= amount;

      const tx = {
        id: "WD-" + Math.floor(1000 + Math.random() * 9000),
        type: `Withdrawal (${netPayout.toFixed(1)} + 300 fee)`,
        amount: `${amount.toFixed(2)} STORM`,
        status: "PENDING",
        date: new Date().toLocaleDateString()
      };

      AppState.transactions.unshift(tx);
      persistState();
      closeModal("withdrawModal");
      renderGlobalStats();
      renderTxHistory();

      showToast(`Submitted! ${netPayout.toFixed(2)} STORM (Fee: 300 STORM)`);
    }

    /* -------------------------------------------------------------
       16. TRANSACTION HISTORY & INTERACTIVE APPROVAL
    ------------------------------------------------------------- */
    function renderTxHistory() {
      const box = document.getElementById("txHistoryContainer");
      box.innerHTML = "";

      if (AppState.transactions.length === 0) {
        box.innerHTML = `<div style="font-size:11px; color:var(--text-dim); text-align:center; padding:10px;">No transactions recorded.</div>`;
        return;
      }

      AppState.transactions.forEach(t => {
        const row = document.createElement("div");
        row.className = "tx-row";
        row.style.cursor = "default";

        row.innerHTML = `
          <div>
            <div style="font-weight:700;">${t.type}</div>
            <div style="font-size:10px; color:var(--text-dim);">${t.date} • ${t.id}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800; color:var(--gold-primary);">${t.amount}</div>
            <span class="tx-status status-${t.status}">${t.status}</span>
          </div>
        `;
        box.appendChild(row);
      });
    }

    /* -------------------------------------------------------------
       17. GLOBAL RENDER DISPATCHER
    ------------------------------------------------------------- */
    function renderGlobalStats() {
      document.getElementById("homeTotalBalance").textContent = AppState.balances.total.toFixed(3);
      document.getElementById("homeAvailBalance").textContent = AppState.balances.available.toFixed(3);
      document.getElementById("homePendingBalance").textContent = AppState.balances.pendingMining.toFixed(3);
      document.getElementById("withdrawAvailBal").textContent = AppState.balances.available.toFixed(3);

      const speed = getTotalMiningSpeed();
      document.getElementById("miningPowerText").textContent = `${speed.toFixed(1)} STORM/h`;
      document.getElementById("miningTierText").textContent = AppState.mining.extraSpeed > 0 
        ? `Hardware (+${AppState.mining.extraSpeed} STORM/h)` 
        : "Tier 1 Free";

      updateVerificationBadges();
      recalculateUSD();
      renderTeamSection();
      updateWithdrawalEligibilityUI();
      updateSavedWalletUI();
    }

    function renderMiningView() {
      renderGlobalStats();
      updateMiningTimer();
    }

    function switchTab(pageId, navButton) {
      document.querySelectorAll(".page-view").forEach(p => p.classList.remove("active"));
      document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));

      const target = document.getElementById(pageId);
      if (target) target.classList.add("active");

      if (navButton) {
        navButton.classList.add("active");
      } else {
        const match = Array.from(document.querySelectorAll(".nav-item")).find(btn => 
          btn.getAttribute("onclick")?.includes(pageId)
        );
        if (match) match.classList.add("active");
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function closeModal(id) {
      const modal = document.getElementById(id);
      if (modal) modal.classList.remove("show");
      if (id === "verificationModal" || id === "minerBuyModal") {
        clearInterval(paymentCountdownInterval);
        activePaymentRequest = null;
      }
    }

    function showToast(msg) {
      const toast = document.getElementById("toast");
      toast.textContent = msg;
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
      }, 3000);
    }

    document.querySelectorAll(".modal-overlay").forEach(overlay => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.classList.remove("show");
      });
    });

    /* -------------------------------------------------------------
       18. BOOTSTRAP INITIALIZATION
    ------------------------------------------------------------- */
    window.addEventListener("DOMContentLoaded", async () => {
      await loadSavedState();
      AppState.user.verified = false;
      serverApprovedPaymentIds = new Set();
      initTelegramSDK();
      await syncPaymentStatus(true);
      drawWheelCanvas();
      renderMinersShop();
      renderTasks();
      renderStreakCalendar();
      renderTxHistory();
      renderGlobalStats();
      renderMiningView();

      fetchDexScreenerPrice();

      setInterval(updateMiningTimer, 1000);
      setInterval(updateSpinCountdown, 1000);
      setInterval(() => renderTasks(), 60000); // Check 24h task timers every minute
      setInterval(() => fetchDexScreenerPrice(false), 45000);
      setInterval(() => syncPaymentStatus(false), 15000);
    });
  

/* ---- Additional UI controller ---- */


    (function () {
      var splash = document.getElementById("splash");
      var fill = document.getElementById("splashFill");
      var status = document.getElementById("splashStatus");
      if (!splash) return;

      var MIN_MS = 1800, MAX_MS = 5000;
      var start = Date.now(), loaded = false, closed = false, pct = 0;
      var steps = [
        [0,  "Starting up"],
        [35, "Syncing balance"],
        [65, "Loading miners"],
        [90, "Almost ready"]
      ];

      function setProgress(p) {
        pct = Math.max(pct, Math.min(100, p));
        fill.style.width = pct + "%";
        for (var i = steps.length - 1; i >= 0; i--) {
          if (pct >= steps[i][0]) { status.textContent = steps[i][1]; break; }
        }
      }

      function close() {
        if (closed) return;
        closed = true;
        setProgress(100);
        status.textContent = "Ready";
        setTimeout(function () {
          splash.classList.add("hide");
          setTimeout(function () { splash.remove(); }, 600);
        }, 250);
      }

      var timer = setInterval(function () {
        var elapsed = Date.now() - start;
        // Ease toward 90% while waiting, jump to 100% when ready
        setProgress(Math.min(90, (elapsed / MIN_MS) * 90));
        if ((loaded && elapsed >= MIN_MS) || elapsed >= MAX_MS) {
          clearInterval(timer);
          close();
        }
      }, 120);

      function markLoaded() { loaded = true; }
      if (document.readyState === "complete") markLoaded();
      else window.addEventListener("load", markLoaded);
    })();
  

/* ---- Additional UI controller ---- */


    (function () {
      var orb = document.getElementById("stormOrb");
      if (!orb) return;
      var card = orb.closest(".mining-hero-card");

      // Speed up effects while mining is active
      function sync() {
        try { card.classList.toggle("is-mining", !!(AppState && AppState.mining && AppState.mining.isActive)); }
        catch (e) { /* app state not ready yet */ }
      }
      sync();
      setInterval(sync, 1000);

      // Gentle 3D tilt following the finger / pointer
      orb.addEventListener("pointermove", function (e) {
        var r = orb.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        orb.style.setProperty("--ry", (x * 18).toFixed(1) + "deg");
        orb.style.setProperty("--rx", (-y * 18).toFixed(1) + "deg");
      });
      function reset() { orb.style.setProperty("--rx", "0deg"); orb.style.setProperty("--ry", "0deg"); }
      orb.addEventListener("pointerleave", reset);
      orb.addEventListener("pointerup", reset);

      // Tap = energy burst
      orb.addEventListener("click", function () {
        orb.classList.remove("zap");
        void orb.offsetWidth;
        orb.classList.add("zap");
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
        try { window.Telegram.WebApp.HapticFeedback.impactOccurred("light"); } catch (e) {}
        setTimeout(function () { orb.classList.remove("zap"); }, 600);
      });
    })();
  

/* ---- Additional UI controller ---- */


  (function () {
    var $ = function (id) { return document.getElementById(id); };
    var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
    function wrap(name, after) {
      var o = window[name]; if (typeof o !== "function") return;
      window[name] = function () { var r = o.apply(this, arguments); try { after(r, arguments); } catch (e) {} return r; };
    }
    function hap() { try { window.Telegram.WebApp.HapticFeedback.impactOccurred("light"); } catch (e) {} }

    /* ---- 5. Skeleton loading ---- */
    var skelIds = ["homeTotalBalance", "homeAvailBalance", "homePendingBalance", "homeFiatUSD", "liveTokenPriceDisplay"];
    skelIds.forEach(function (i) { if ($(i)) $(i).classList.add("skel"); });
    var shop = $("minerCardsContainer");
    if (shop) shop.innerHTML = '<div class="skel-card"></div><div class="skel-card"></div><div class="skel-card"></div>';
    function unskel(ids) { (ids || skelIds).forEach(function (i) { if ($(i)) $(i).classList.remove("skel"); }); }
    setTimeout(function () { unskel(); }, 7000);

    /* ---- 2 & 6. Header: rank badge + streak flame ---- */
    $("userIdTxt").insertAdjacentHTML("afterend", '<div class="hdr-chips"><span id="rankBadge" class="rank r-bronze"></span><span id="streakChip" class="streak-chip l0"></span></div>');
    function updateChips() {
      var sp = getTotalMiningSpeed();
      var r = sp >= 80 ? ["diamond", "Diamond"] : sp >= 40 ? ["gold", "Gold"] : sp >= 20 ? ["silver", "Silver"] : ["bronze", "Bronze"];
      var rb = $("rankBadge"); rb.className = "rank r-" + r[0]; rb.textContent = "◆ " + r[1] + " Miner";
      var st = AppState.streak, today = new Date().toDateString();
      var d = st.lastClaimDate === today ? (st.currentDay === 1 ? 7 : st.currentDay - 1) : st.currentDay - 1;
      var lv = d >= 6 ? 3 : d >= 3 ? 2 : d >= 1 ? 1 : 0;
      var sc = $("streakChip"); sc.className = "streak-chip l" + lv;
      sc.innerHTML = '<svg viewBox="0 0 24 24"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg>' + d + "d";
    }

    /* ---- 3. Progress ring + countdown chip around the orb ---- */
    var orb = $("stormOrb");
    orb.insertAdjacentHTML("afterbegin", '<svg class="orb-ring" viewBox="0 0 100 100"><circle class="t" cx="50" cy="50" r="48"/><circle class="f" id="orbFill" cx="50" cy="50" r="48"/></svg>');
    orb.insertAdjacentHTML("beforeend", '<div class="orb-chip" id="orbChip">--:--:--</div>');
    function updateRing() {
      var p = parseFloat($("miningProgressFillBar").style.width) || 0;
      $("orbFill").style.strokeDashoffset = (301.6 * (1 - p / 100)).toFixed(1);
      $("orbChip").textContent = $("miningCountdownTimer").textContent;
    }
    setInterval(updateRing, 500);

    /* ---- 1. Live yield counter + floating +value ---- */
    var yv = $("miningAccumulatedVal"), yBox = yv.parentElement.parentElement;
    yBox.style.position = "relative";
    function mState() {
      var m = AppState.mining; if (!m.isActive) return null;
      var dur = m.durationSeconds || 28800, el = Date.now() - m.startedAt;
      return el < dur * 1000 ? { m: m, dh: Math.round(dur / 3600), el: el } : null;
    }
    setInterval(function () {
      var x = mState(); if (!x) return;
      yv.textContent = (Math.min(x.dh, x.el / 3.6e6) * (x.m.baseSpeed + x.m.extraSpeed)).toFixed(3);
    }, 100);
    setInterval(function () {
      if (!mState() || document.hidden) return;
      var f = document.createElement("span"); f.className = "yfloat";
      f.textContent = "+" + (getTotalMiningSpeed() / 3600).toFixed(3);
      yBox.appendChild(f); setTimeout(function () { f.remove(); }, 1500);
    }, 1000);

    /* ---- 4. Celebration (claim / check-in / wheel win) ---- */
    function celebrate(amount, label) {
      var o = document.createElement("div"); o.className = "cele";
      var h = '<div class="cele-amt"><small>' + (label || "CLAIMED") + '</small><b>+0.00</b><span>STORM</span></div>';
      for (var i = 0; i < 30; i++) {
        var a = Math.random() * 6.283, d = 90 + Math.random() * 130;
        h += '<i style="--dx:' + (Math.cos(a) * d).toFixed(0) + "px;--dy:" + (Math.sin(a) * d - 40).toFixed(0) + "px;--r:" + (Math.random() * 540 | 0) + "deg;--d:" + (Math.random() * .25).toFixed(2) + 's"></i>';
      }
      o.innerHTML = h; document.body.appendChild(o);
      var b = o.querySelector("b"), t0 = performance.now();
      (function step(t) { var k = Math.min(1, (t - t0) / 900); b.textContent = "+" + (amount * (1 - Math.pow(1 - k, 3))).toFixed(2); if (k < 1) requestAnimationFrame(step); })(t0);
      hap(); setTimeout(function () { o.style.transition = "opacity .4s"; o.style.opacity = 0; }, 1900); setTimeout(function () { o.remove(); }, 2400);
    }
    function wrapGain(name, label) {
      var o = window[name]; if (typeof o !== "function") return;
      window[name] = function () {
        var t = AppState.balances.total, r = o.apply(this, arguments);
        try { var g = AppState.balances.total - t; if (g > 0) celebrate(g, label); } catch (e) {}
        return r;
      };
    }
    wrapGain("handleClaimMiningClick", "REWARD CLAIMED");
    wrapGain("claimDailyStreakReward", "DAILY BONUS");

    /* ---- 9. Wheel: ticks, haptics, glowing pointer, big win ---- */
    var AC = null;
    function tick() {
      try {
        if (AC) { var os = AC.createOscillator(), g = AC.createGain(); os.type = "square"; os.frequency.value = 1100;
          g.gain.setValueAtTime(.04, AC.currentTime); g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + .04);
          os.connect(g); g.connect(AC.destination); os.start(); os.stop(AC.currentTime + .045); }
      } catch (e) {}
      try { window.Telegram.WebApp.HapticFeedback.selectionChanged(); } catch (e) { if (navigator.vibrate) navigator.vibrate(6); }
      var p = document.querySelector(".wheel-pointer"); p.classList.remove("tick"); void p.offsetWidth; p.classList.add("tick");
    }
    var ow = window.handleSpinWheelClick;
    window.handleSpinWheelClick = function () {
      var before = AppState.balances.total, wasSpinning = isSpinningWheel;
      try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {}
      var r = ow.apply(this, arguments);
      if (!wasSpinning && isSpinningWheel) {
        var c = $("wheelCanvas"), w = c.parentElement, last = null, n = SPIN_SEGMENTS.length;
        w.classList.add("spinning");
        (function loop() {
          if (!isSpinningWheel) { w.classList.remove("spinning"); return; }
          var m = new DOMMatrix(getComputedStyle(c).transform), a = (Math.atan2(m.b, m.a) * 180 / Math.PI + 360) % 360, sg = Math.floor(a / (360 / n));
          if (last !== null && sg !== last) tick();
          last = sg; requestAnimationFrame(loop);
        })();
        setTimeout(function () { var g = AppState.balances.total - before; if (g > 0) celebrate(g, "YOU WON"); }, 4350);
      }
      return r;
    };

    /* ---- 7. Miner rarity + best value ---- */
    wrap("renderMinersShop", function () {
      var best = 0, bv = 0;
      MINER_LIST.forEach(function (m, i) { var v = m.speed / m.priceTon; if (v > bv) { bv = v; best = i; } });
      $$("#minerCardsContainer .miner-card").forEach(function (c, i) {
        var names = ["Common", "Rare", "Epic", "Legendary", "Mythic"], k = Math.min(i, 4);
        c.classList.add("rar-" + k);
        var nm = c.querySelector('div[style*="font-weight:800"]');
        if (nm) nm.insertAdjacentHTML("beforeend", '<span class="rar-tag">' + names[k] + "</span>" + (i === best ? '<span class="rar-tag best">Best value</span>' : ""));
      });
    });

    /* ---- 10. Withdrawal progress ---- */
    var wBtn = document.querySelector('button[onclick="openWithdrawModal()"]');
    wBtn.insertAdjacentHTML("beforebegin",
      '<div class="prog-wrap"><div><div class="prog-row"><span>Verified referrals</span><b id="wdRefTxt">No referrals required</b></div><div class="prog-track"><i id="wdRefBar"></i></div></div>' +
      '<div><div class="prog-row"><span>Minimum balance</span><b id="wdBalTxt">0 / 5000</b></div><div class="prog-track"><i id="wdBalBar"></i></div></div></div>');
    function updateWdProg() {
      var need = STORM_CONFIG.MIN_VERIFIED_REFERRALS, min = STORM_CONFIG.MIN_WITHDRAWAL_STORM;
      var v = AppState.teamMembers.filter(function (m) { return m.verified; }).length, bal = AppState.balances.available;
      $("wdRefTxt").textContent = need === 0 ? "No referrals required" : Math.min(v, need) + " of " + need + " verified";
      $("wdBalTxt").textContent = Math.floor(bal) + " / " + min + " STORM";
      var a = $("wdRefBar"), b = $("wdBalBar");
      a.style.width = (need === 0 ? 100 : Math.min(100, v / need * 100)) + "%"; a.className = "ok";
      b.style.width = Math.min(100, bal / min * 100) + "%"; b.className = bal >= min ? "ok" : "";
    }

    /* ---- 11. Price trend arrow + sparkline ---- */
    var pr = $("livePriceChangeDisplay");
    pr.insertAdjacentHTML("afterend", '<svg class="spark" id="priceSpark" viewBox="0 0 60 22"></svg>');
    new MutationObserver(function () {
      var t = pr.textContent;
      if (/^[+-]?\d/.test(t)) pr.textContent = (t.charAt(0) === "-" ? "▼ " : "▲ ") + t.replace(/^\+/, "");
    }).observe(pr, { childList: true, characterData: true, subtree: true });
    new MutationObserver(function () { if ($("liveTokenPriceDisplay").textContent !== "Loading...") unskel(["liveTokenPriceDisplay"]); })
      .observe($("liveTokenPriceDisplay"), { childList: true, characterData: true, subtree: true });
    var oF = window.fetch;
    window.fetch = function (u) {
      var p = oF.apply(this, arguments);
      try {
        if (String(u) === STORM_CONFIG.DEXSCREENER_API) p.then(function (r) { return r.clone().json(); }).then(function (j) {
          var pair = (j.pairs || []).find(function (x) { return x.chainId === "ton"; }) || (j.pairs || [])[0]; if (!pair) return;
          var pc = pair.priceChange || {}, px = parseFloat(pair.priceUsd);
          var pts = [pc.h24, pc.h6, pc.h1, 0].map(function (c) { return px / (1 + (parseFloat(c) || 0) / 100); });
          var mn = Math.min.apply(0, pts), mx = Math.max.apply(0, pts), rg = (mx - mn) || 1;
          var poly = pts.map(function (v, i) { return (i * 20) + "," + (20 - (v - mn) / rg * 18).toFixed(1); }).join(" ");
          $("priceSpark").innerHTML = '<polyline stroke="' + ((parseFloat(pc.h24) || 0) >= 0 ? "#10B981" : "#EF4444") + '" points="' + poly + '"/>';
        }).catch(function () {});
      } catch (e) {}
      return p;
    };

    /* ---- 12. Friendly empty states ---- */
    function empty(box, svg, title, sub) {
      box.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24">' + svg + "</svg><b>" + title + "</b>" + sub + "</div>";
    }
    wrap("renderTxHistory", function () {
      var b = $("txHistoryContainer");
      if (b && !b.querySelector(".tx-row")) empty(b, '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>', "No transactions yet", "Your withdrawals and purchases will show up here.");
    });
    wrap("renderTeamSection", function () {
      var b = $("teamMembersListContainer");
      if (b && /No team members/.test(b.textContent)) empty(b, '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a3 3 0 1 0 0-6M21 20c0-2.5-1.5-4.600-4-5.400"/>', "No team members yet", "Share your invite link to start earning 10%.");
    });

    /* ---- 8. Nav pill ---- */
    var nav = document.querySelector(".bottom-nav"), pill = document.createElement("span");
    pill.className = "nav-pill"; nav.insertBefore(pill, nav.firstChild);
    function movePill() {
      var a = document.querySelector(".nav-item.active"); if (!a) return;
      pill.style.width = (a.offsetWidth - 14) + "px"; pill.style.transform = "translateX(" + (a.offsetLeft + 7) + "px)";
    }
    wrap("switchTab", movePill);
    window.addEventListener("resize", movePill);
    movePill(); setTimeout(movePill, 300);

    /* ---- Hooks into the global render ---- */
    wrap("renderGlobalStats", function () { unskel(); updateChips(); updateWdProg(); });
    wrap("renderStreakCalendar", updateChips);
    wrap("claimDailyStreakReward", updateChips);
  })();
  