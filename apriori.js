const reader = require("xlsx");
const file = reader.readFile("retail_dataset.xlsx");

let data = [];
const temp = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[0]]);

temp.forEach((res) => {
  let object = { TransactionNumber: res["Transaction Number"] };
  delete res["Transaction Number"];
  let values = Object.values(res);
  object["items"] = values;
  data.push(object);
});
// console.log(data);
apriori(data, 80, 0.6);

// minSupport in numbers as integer, minConfidence in percentage as deciaml
function apriori(data, minSupport, minConfidence) {
  let frequentItemSets = [];
  let itemCounterMap = new Map();

  // initial frequentItemSet count
  data.forEach((transaction) => {
    transaction.items.forEach((item) => {
      if (!itemCounterMap.has(item)) {
        itemCounterMap.set(item, 1);
      } else {
        itemCounterMap.set(item, itemCounterMap.get(item) + 1);
      }
    });
  });

  // filter frequent items
  itemCounterMap.forEach((value, key) => {
    if (value >= minSupport) {
      frequentItemSets.push(new Array(key));
    }
  });

  // get final frequent itemset
  let result = getFrequentSets(frequentItemSets, minSupport);
  console.log(result);

  // get all association rules
  let rules = getRules(result);

  // get strong association rules
  let strongRules = getStrongRules(rules, minConfidence);

  strongRules.forEach((rule) => {
    console.log(
      rule.LHS,
      "-->",
      rule.RHS,
      " , with confidence of: ",
      rule.confidence
    );
  });
}

function getFrequentSets(FSets, minSupport) {
  // console.log(FSets);
  // Create new Item Set
  let newFSets = [];
  for (let outerCounter = 0; outerCounter < FSets.length - 1; outerCounter++) {
    for (
      let innerCounter = outerCounter + 1;
      innerCounter < FSets.length;
      innerCounter++
    ) {
      FSets[innerCounter].forEach((Item) => {
        if (!FSets[outerCounter].includes(Item)) {
          let tempArr = FSets[outerCounter].slice(0);
          tempArr.push(Item);
          newFSets.push(tempArr);
        }
      });
    }
  }

  // Remove Duplicates
  newFSets = removeDuplicates(newFSets);

  // Remove minCount and minConf
  newFSets = removeByMinSupport(newFSets, minSupport);

  if (newFSets.length == 1) {
    return newFSets;
  } else if (newFSets.length == 0) {
    return FSets;
  } else {
    return getFrequentSets(newFSets, minSupport);
  }
}

function removeDuplicates(newFSets) {
  for (let outerCounter = 0; outerCounter < newFSets.length; outerCounter++) {
    for (
      let innerCounter = outerCounter + 1;
      innerCounter < newFSets.length;
      innerCounter++
    ) {
      let tempArr = newFSets[outerCounter].slice(0);
      newFSets[innerCounter].forEach((item) => {
        if (tempArr.includes(item)) {
          let index = tempArr.indexOf(item);
          tempArr.splice(index, 1);
        }
      });
      if (tempArr.length == 0) {
        newFSets.splice(outerCounter, 1);
        outerCounter--;
        innerCounter--;
        break;
      }
    }
  }

  return newFSets;
}

function removeByMinSupport(newFSets, minSupport) {
  let map = [];
  newFSets.forEach((Set) => {
    let counter = 0;

    data.forEach((object) => {
      if (Set.every((item) => object.items.includes(item))) {
        counter++;
      }
    });
    map.push(new Array(Set, counter));
  });

  newFSets = [];
  map.forEach((set) => {
    if (set[1] >= minSupport) {
      newFSets.push(set[0]);
    }
  });

  return newFSets;
}

function getRules(sets) {
  let rules = [];

  // get subsets and rules
  sets.forEach((set) => {
    var allSubSets = set.reduce(
      (subsets, value) =>
        subsets.concat(subsets.map((singleSet) => [value, ...singleSet])),
      [[]]
    );

    allSubSets.forEach((firstSubset, firstIndex) => {
      if (firstSubset.length != 0 && firstSubset.length != set.length) {
        allSubSets.forEach((secondSubset, secondIndex) => {
          if (
            firstIndex != secondIndex &&
            firstSubset.length + secondSubset.length == set.length &&
            !firstSubset.some((val) => secondSubset.includes(val))
          ) {
            rules.push({ LHS: firstSubset, RHS: secondSubset });
          }
        });
      }
    });
  });

  return rules;
}

function getStrongRules(rules, minConfidence) {
  let strongRules = [];
  rules.forEach((rule) => {
    let allItems = rule.LHS.concat(rule.RHS);
    let allItemsCounter = 0;
    let LHSItemsCounter = 0;
    data.forEach((transaction) => {
      if (allItems.every((item) => transaction.items.includes(item))) {
        allItemsCounter++;
      }
      if (rule.LHS.every((item) => transaction.items.includes(item))) {
        LHSItemsCounter++;
      }
    });
    let ratio = allItemsCounter / LHSItemsCounter;
    if (ratio >= minConfidence) {
      rule["confidence"] = ratio;
      strongRules.push(rule);
    }
  });

  return strongRules;
}
