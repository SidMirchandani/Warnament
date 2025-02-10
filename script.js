// Game Variables
let gold = 40;
let army = 30;
let morale = 1.0; // 1.0 is neutral morale.
let turn = 0;
let year = 1792;
let monthIndex = 3;

// Countries (each starts as neutral with a given starting army)
let countries = [
  { name: "Austria", strength: 50, status: "Neutral", army: 40 },
  { name: "Prussia", strength: 40, status: "Neutral", army: 30 },
  { name: "Britain", strength: 60, status: "Neutral", army: 50 },
  { name: "Spain", strength: 45, status: "Neutral", army: 35 },
  { name: "Russia", strength: 70, status: "Neutral", army: 60 },
  { name: "Portugal", strength: 30, status: "Neutral", army: 20 },
  { name: "Piedmont-Sardinia", strength: 35, status: "Neutral", army: 25 }
];

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const goldPerTurn = 10;
const recruitCost = 10;
const attackCost = 0;
const enemyRecruitRate = 5;
const enemyCountryConflictChance = 0.1; // 10% chance each turn for an enemy to initiate conflict against another enemy

// Per-turn action records (using country names as keys)
let warDeclaredThisTurn = {};   // For "Declare War"
let attackUsedThisTurn = {};      // For "Attack"
let peaceOfferedThisTurn = {};    // For "Make Peace"

// UI Update: updates stats on screen and checks game status
function updateStats() {
  document.getElementById('gold').innerText = gold;
  document.getElementById('army').innerText = army;
  document.getElementById('morale').innerText = morale.toFixed(2);
  document.getElementById('turn').innerText = turn;
  document.getElementById('date').innerText = `${months[monthIndex]} ${year}`;

  let conqueredList = countries
  .filter(c => c.status === "Conquered")
  .map(c => `${c.name} (Army: ${c.army})`)
  .join(", ") || "None";
  let warList = countries
  .filter(c => c.status === "At War")
  .map(c => `${c.name} (Army: ${c.army})`)
  .join(", ") || "None";
  let remainingList = countries
  .filter(c => c.status === "Neutral")
  .map(c => `${c.name} (Army: ${c.army})`)
  .join(", ") || "None";

  document.getElementById('conquered-countries').innerText = conqueredList;
  document.getElementById('countries-at-war').innerText = warList;
  document.getElementById('remaining-countries').innerText = remainingList;

  checkGameStatus();
}

// Check Win/Loss Conditions (do not reload; just log and disable actions)
function checkGameStatus() {
  if (army <= 0) {
    logMessage("❌ Game Over! Your army has been destroyed.");
    disableAllActions();
  }
  if (countries.every(c => c.status === "Conquered")) {
    logMessage("🎉 Victory! You have conquered all nations!");
    disableAllActions();
  }
}

// Disable all actions when the game ends
function disableAllActions() {
  document.querySelectorAll("button").forEach(button => {
    button.disabled = true;
  });
}

// Clear the event log (so that only the current turn’s events are shown)
function clearLog() {
  document.getElementById("event-log").innerHTML = "";
}

// Log message: prepends new messages so the most recent appears at the top
function logMessage(message) {
  let logElement = document.getElementById("event-log");
  logElement.innerHTML = `<p>${message}</p>` + logElement.innerHTML;
}

// Recruit Soldiers
function recruitSoldiers() {
  if (gold >= recruitCost) {
    army += 5;
    gold -= recruitCost;
    logMessage("You recruited 5 soldiers! ⚔️ (-10 Gold)");
  } else {
    logMessage("Not enough gold to recruit! ❌");
  }
  updateStats();
}

// Show Declare War Menu & hide other submenus
function showDeclareWarMenu() {
  document.getElementById("attack-menu").style.visibility = "hidden";
  document.getElementById("peace-menu").style.visibility = "hidden";

  let declareWarMenu = document.getElementById("declare-war-menu");
  declareWarMenu.innerHTML = "";
  declareWarMenu.style.visibility = "visible";

  let neutralCountries = countries.filter(c => c.status === "Neutral");
  if (neutralCountries.length === 0) {
    declareWarMenu.innerHTML = "<p>No available targets.</p>";
  } else {
    neutralCountries.forEach(country => {
      let btn = document.createElement("button");
      btn.innerText = `${country.name} (Army: ${country.army})`;
      btn.onclick = () => declareWar(country.name);
      declareWarMenu.appendChild(btn);
    });
  }
}

// Declare War on a country
function declareWar(countryName) {
  if (warDeclaredThisTurn[countryName]) {
    logMessage(`You have already declared war on ${countryName} this turn.`);
    return;
  }
  let country = countries.find(c => c.name === countryName);
  if (!country) return;
  country.status = "At War";
  warDeclaredThisTurn[countryName] = true;
  logMessage(`You have declared war on ${country.name} (Army: ${country.army})! ⚔️`);
  updateStats();
}

// Show Attack Menu & hide other submenus
function showAttackMenu() {
  document.getElementById("declare-war-menu").style.visibility = "hidden";
  document.getElementById("peace-menu").style.visibility = "hidden";

  let attackMenu = document.getElementById("attack-menu");
  attackMenu.innerHTML = "";
  attackMenu.style.visibility = "visible";

  let warCountries = countries.filter(c => c.status === "At War");
  if (warCountries.length === 0) {
    attackMenu.innerHTML = "<p>No available targets.</p>";
  } else {
    warCountries.forEach(country => {
      let btn = document.createElement("button");
      btn.innerText = `${country.name} (Army: ${country.army})`;
      btn.onclick = () => attackCountry(country.name);
      attackMenu.appendChild(btn);
    });
  }
}

// Attack a country – effective enemy power is computed as the sum of armies of all enemy nations at war.
function attackCountry(countryName) {
  if (attackUsedThisTurn[countryName]) {
    logMessage(`You have already attacked ${countryName} this turn.`);
    return;
  }
  if (warDeclaredThisTurn[countryName]) {
    logMessage(`You cannot attack ${countryName} on the same turn you declared war on it.`);
    return;
  }
  let country = countries.find(c => c.name === countryName);
  if (!country) return;
  if (gold < attackCost || army <= 0) {
    logMessage("Not enough gold or troops to attack! ❌");
    return;
  }
  gold -= attackCost;

  // Compute total enemy army from all countries at war.
  let totalEnemyArmy = countries
  .filter(c => c.status === "At War")
  .reduce((sum, c) => sum + c.army, 0);

  // Calculate effective power with diminishing returns and randomness.
  let playerPower = (1 + morale * 0.001) * (Math.sqrt(army) * 10 + Math.random() * 30);
  let enemyPower = (Math.sqrt(totalEnemyArmy) * 10 + Math.random() * 30);

  if (playerPower > enemyPower) {
    // Victory: enemy loses 10 soldiers.
    country.army -= 10;
    gold += 20;
    morale = Math.min(morale + 0.1, 2.0);
    logMessage(`Victory in battle! ${country.name} (Army now: ${country.army}) lost 10 soldiers. (+20 Gold, Morale increased) ⚔️`);
    if (country.army <= 0) {
      country.status = "Conquered";
      gold += 40;
      logMessage(`You have fully conquered ${country.name} (Army: 0)! (+400 Gold)`);
    }
  } else {
    // Loss: you lose 10 soldiers and morale decreases.
    army -= 10;
    morale = Math.max(morale - 0.1, 0.5);
    logMessage(`Attack on ${country.name} (Army: ${country.army}) failed! You lost 10 soldiers. (Morale decreased)`);
  }
  attackUsedThisTurn[countryName] = true;
  updateStats();
}

// Show Make Peace Menu & hide other submenus
function showPeaceMenu() {
  document.getElementById("declare-war-menu").style.visibility = "hidden";
  document.getElementById("attack-menu").style.visibility = "hidden";

  let peaceMenu = document.getElementById("peace-menu");
  peaceMenu.innerHTML = "";
  peaceMenu.style.visibility = "visible";

  let warCountries = countries.filter(c => c.status === "At War");
  if (warCountries.length === 0) {
    peaceMenu.innerHTML = "<p>No ongoing wars.</p>";
  } else {
    warCountries.forEach(country => {
      let btn = document.createElement("button");
      btn.innerText = `${country.name} (Army: ${country.army})`;
      btn.onclick = () => makePeace(country.name);
      peaceMenu.appendChild(btn);
    });
  }
}

// Attempt to make peace with a country (only one attempt per country per turn)
function makePeace(countryName) {
  if (peaceOfferedThisTurn[countryName]) {
    logMessage(`You have already attempted peace with ${countryName} this turn.`);
    return;
  }
  peaceOfferedThisTurn[countryName] = true;
  let country = countries.find(c => c.name === countryName);
  if (country && country.status === "At War") {
    if (Math.random() < 1/3) {
      logMessage(`${country.name} (Army: ${country.army}) declined your peace offer!`);
    } else {
      country.status = "Neutral";
      logMessage(`Peace treaty signed with ${country.name} (Army: ${country.army}). ✌️`);
    }
  }
  updateStats();
}

// AI Enemy Actions: simulate enemy recruiting, occasional war declarations on you, enemy attacks,
// and also enemy countries attacking each other.
function simulateEnemyActions() {
  // Process each enemy country's actions against you
  countries.forEach(country => {
    if (country.status !== "Conquered") {
      // Recruitment: add a base amount with a small chance for a bonus.
      if (Math.random() < 0.05) {
        country.army += 10;
      } else {
        country.army += enemyRecruitRate;
      }
      // A neutral country may declare war on you (1 in 15 chance)
      if (country.status === "Neutral" && Math.random() < (1/15)) {
        country.status = "At War";
        logMessage(`${country.name} (Army: ${country.army}) has declared war on you! ⚔️`);
      }
      // If a country is at war, it may attack you.
      if (country.status === "At War" && Math.random() < 0.5) {
        // Compute total enemy army from all countries at war.
        let totalEnemyArmy = countries
        .filter(c => c.status === "At War")
        .reduce((sum, c) => sum + c.army, 0);
        let enemyPower = (Math.sqrt(totalEnemyArmy) * 10 + Math.random() * 30);
        let playerPower = morale * (Math.sqrt(army) * 10 + Math.random() * 30);
        if (playerPower > enemyPower) {
          // When an enemy attacks and loses, you now only gain 5 soldiers.
          country.army -= 10;
          army += 5;
          logMessage(`${country.name} attacked you but lost the battle! They lost 10 soldiers. (+5 Army) ⚔️`);
          if (country.army <= 0) {
            country.status = "Conquered";
            gold += 400;
            logMessage(`You have fully conquered ${country.name} (Army: 0)! (+400 Gold)`);
          }
        } else {
          army -= 10;
          morale = Math.max(morale - 0.1, 0.5);
          logMessage(`${country.name} (Army: ${country.army}) attacked you and won the battle. You lost 10 soldiers. (Morale decreased)`);
        }
      }
    }
  });

  // Simulate enemy countries attacking each other.
  let enemyConflictThisTurn = {};
  countries.forEach(attacker => {
    if (attacker.status !== "Conquered" && !enemyConflictThisTurn[attacker.name] && Math.random() < enemyCountryConflictChance) {
      let potentialTargets = countries.filter(target => target.name !== attacker.name && target.status !== "Conquered" && !enemyConflictThisTurn[target.name]);
      if (potentialTargets.length > 0) {
        let target = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
        let attackerPower = Math.sqrt(attacker.army) * 10 + Math.random() * 30;
        let defenderPower = Math.sqrt(target.army) * 10 + Math.random() * 30;
        if (attackerPower > defenderPower) {
          // Attacker wins the battle.
          target.army -= 10;
          logMessage(`${attacker.name} attacked ${target.name} and won! ${target.name} lost 10 soldiers.`);
          // If the target is still alive, there is a 1 in 20 chance for a takeover.
          if (target.army > 0 && Math.random() < 0.05) {
            target.status = "Conquered";
            attacker.army += 100;
            logMessage(`${attacker.name} has taken over ${target.name}! (+100 Army)`);
          } else if (target.army <= 0) {
            target.status = "Conquered";
            logMessage(`${target.name} has been conquered by ${attacker.name}!`);
          }
        } else {
          // Attacker loses the battle.
          attacker.army -= 10;
          logMessage(`${attacker.name} attacked ${target.name} but lost! ${attacker.name} lost 10 soldiers.`);
          if (attacker.army <= 0) {
            attacker.status = "Conquered";
            logMessage(`${attacker.name} has been conquered by ${target.name}!`);
          }
        }
        enemyConflictThisTurn[attacker.name] = true;
        enemyConflictThisTurn[target.name] = true;
      }
    }
  });
}

// End Turn: clear log (so that only current turn events show), simulate enemy actions, update turn info, reset per-turn records, and hide all submenus.
function endTurn() {
  clearLog();
  simulateEnemyActions();

  turn++;
  gold += goldPerTurn;
  monthIndex++;
  if (monthIndex >= 12) {
    monthIndex = 0;
    year++;
  }

  logMessage(`Turn ${turn} ended. Income received. (+${goldPerTurn} Gold)`);

  // Reset per-turn records
  warDeclaredThisTurn = {};
  attackUsedThisTurn = {};
  peaceOfferedThisTurn = {};

  // Hide all submenus
  document.getElementById("declare-war-menu").style.visibility = "hidden";
  document.getElementById("attack-menu").style.visibility = "hidden";
  document.getElementById("peace-menu").style.visibility = "hidden";

  updateStats();
}

// Initialize UI: clear the log and update stats initially.
clearLog();
updateStats();
