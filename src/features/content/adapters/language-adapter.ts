export type NormalizationOptions = {
  caseSensitive?: boolean;
  kanaEquivalence?: boolean;
  traditionalEquivalence?: boolean;
  tonePolicy?: "ignore" | "require" | "numbers";
  ignoreSpaces?: boolean;
};

const pinyinToneMap: Record<string, { base: string; tone: number }> = {
  'ā': { base: 'a', tone: 1 }, 'á': { base: 'a', tone: 2 }, 'ǎ': { base: 'a', tone: 3 }, 'à': { base: 'a', tone: 4 },
  'ē': { base: 'e', tone: 1 }, 'é': { base: 'e', tone: 2 }, 'ě': { base: 'e', tone: 3 }, 'è': { base: 'e', tone: 4 },
  'ī': { base: 'i', tone: 1 }, 'í': { base: 'i', tone: 2 }, 'ǐ': { base: 'i', tone: 3 }, 'ì': { base: 'i', tone: 4 },
  'ō': { base: 'o', tone: 1 }, 'ó': { base: 'o', tone: 2 }, 'ǒ': { base: 'o', tone: 3 }, 'ò': { base: 'o', tone: 4 },
  'ū': { base: 'u', tone: 1 }, 'ú': { base: 'u', tone: 2 }, 'ǔ': { base: 'u', tone: 3 }, 'ù': { base: 'u', tone: 4 },
  'ǖ': { base: 'v', tone: 1 }, 'ǘ': { base: 'v', tone: 2 }, 'ǚ': { base: 'v', tone: 3 }, 'ǜ': { base: 'v', tone: 4 },
  'Ā': { base: 'A', tone: 1 }, 'Á': { base: 'A', tone: 2 }, 'Ǎ': { base: 'A', tone: 3 }, 'À': { base: 'A', tone: 4 },
  'Ē': { base: 'E', tone: 1 }, 'É': { base: 'E', tone: 2 }, 'Ě': { base: 'E', tone: 3 }, 'È': { base: 'E', tone: 4 },
  'Ī': { base: 'I', tone: 1 }, 'Í': { base: 'I', tone: 2 }, 'Ǐ': { base: 'I', tone: 3 }, 'Ì': { base: 'I', tone: 4 },
  'Ō': { base: 'O', tone: 1 }, 'Ó': { base: 'O', tone: 2 }, 'Ǒ': { base: 'O', tone: 3 }, 'Ò': { base: 'O', tone: 4 },
  'Ū': { base: 'U', tone: 1 }, 'Ú': { base: 'U', tone: 2 }, 'Ǔ': { base: 'U', tone: 3 }, 'Ù': { base: 'U', tone: 4 },
  'Ǖ': { base: 'V', tone: 1 }, 'Ǘ': { base: 'V', tone: 2 }, 'Ǚ': { base: 'V', tone: 3 }, 'Ǜ': { base: 'V', tone: 4 }
};

const traditionalToSimplifiedMap: Record<string, string> = {
  "國": "国", "體": "体", "會": "会", "漢": "汉", "語": "语", "華": "华", "學": "学", "寫": "写",
  "聽": "听", "讀": "读", "說": "说", "記": "记", "書": "书", "門": "门", "們": "们", "個": "个",
  "這": "这", "那": "那", "東": "东", "西": "西", "車": "车", "時": "时", "後": "后", "頭": "头",
  "開": "开", "問": "问", "間": "间", "對": "对", "過": "过", "見": "见", "經": "经", "論": "论",
  "張": "张", "農": "农", "長": "长", "愛": "爱", "買": "买", "賣": "卖", "錢": "钱", "風": "风",
  "電": "电", "話": "话", "飛": "飞", "機": "机", "馬": "马", "魚": "鱼",
  "鳥": "鸟", "麗": "丽", "義": "义", "烏": "乌", "樂": "乐", "喬": "乔", "鄉": "乡", "習": "习",
  "產": "产", "衆": "众", "傳": "传", "傷": "伤", "倫": "伦",
  "偽": "伪", "側": "侧", "備": "备", "優": "优", "剛": "刚", "創": "创", "劉": "刘",
  "動": "动", "協": "协", "壓": "压", "厭": "厌", "縣": "县", "發": "发", "變": "变", "只": "只",
  "葉": "叶", "員": "员", "響": "响", "單": "单", "圖": "图", "園": "园", "執": "执", "報": "报",
  "聲": "声", "處": "处", "憲": "宪", "導": "导", "專": "专", "尋": "寻", "層": "layer",
  "歲": "岁", "廣": "广", "慶": "庆", "庫": "库", "廠": "厂", "廳": "厅", "彈": "弹", "強": "强",
  "歸": "归", "從": "com", "復": "fu", "微": "wei", "德": "de", "志": "zhi", "憂": "you", "懷": "huai",
  "態": "tai", "憐": "lian", "戰": "zhan", "戲": "xi", "戶": "hu", "手": "shou", "才": "cai",
  "揚": "yang", "撫": "fu", "拋": "pao", "搶": "qiang", "護": "hu", "擊": "ji", "敵": "di", "效": "xiao",
  "數": "shu", "晚": "wan", "晨": "chen", "朧": "long",
  "樣": "yang", "樹": "shu", "橋": "qiao", "檢": "jian", "權": "quan", "步": "bu",
  "歷": "li", "氣": "qi", "水": "shui", "江": "jiang", "河": "he", "油": "you", "治": "zhi",
  "淚": "lei", "淨": "jing", "溫": "wen", "濕": "shi", "滅": "mie", "燈": "deng", "灰": "hui", "靈": "rel",
  "爺": "ye", "爸": "ba", "獨": "du", "獸": "shou", "現": "xian", "理": "li", "環": "huan",
  "瓶": "ping", "甘": "gan", "甜": "tian", "生": "sheng", "用": "yong", "甩": "shuai", "田": "tian",
  "畫": "hua", "留": "liu", "畢": "bi", "痛": "tong", "療": "liao", "登": "deng", "百": "bai", "的": "de",
  "皮": "pi", "皺": "zhou", "益": "yi", "鹽": "yan", "監": "jian", "盒": "he", "看": "kan", "睜": "zheng",
  "知": "zhi", "矯": "jiao", "石": "shi", "破": "po", "確": "que", "礙": "ai", "示": "shi", "禮": "li",
  "社": "she", "神": "shen", "福": "fu", "禪": "chan", "離": "li", "私": "si", "秋": "qiu", "種": "zhong",
  "科": "ke", "秒": "miao", "積": "ji", "稱": "cheng", "稻": "dao", "穀": "gu", "穿": "chuan", "突": "tu",
  "窗": "chuang", "窮": "qiong", "窯": "yao", "立": "li", "站": "zhan", "競": "jing", "筆": "bi", "笑": "xiao",
  "等": "deng", "答": "da", "籌": "chou", "簽": "qian", "簡": "jian", "簿": "bu", "籍": "ji", "米": "mi",
  "類": "lei", "粉": "fen", "粗": "cu", "糖": "tang", "糕": "gao", "系": "xi", "糾": "jiu", "紀": "ji",
  "紅": "hong", "約": "yue", "級": "ji", "純": "chun", "紗": "sha", "綱": "gang", "納": "na",
  "縱": "zong", "紛": "fen", "紙": "zhi", "紋": "wen", "紡": "fang", "線": "xian", "練": "lian", "組": "zu",
  "細": "xi", "紳": "shen", "紹": "shao", "終": "zhong", "結": "jie", "絕": "jue", "絞": "jiao",
  "絡": "luo", "給": "gei", "絨": "rong", "統": "tong", "絲": "si", "綠": "lv", "綴": "zhui", "網": "wang",
  "緊": "jin", "緒": "xu", "緣": "yuan", "編": "bian",
  "緩": "huan", "締": "di", "緯": "wei", "緻": "zhi",
  "縉": "jin", "縛": "fu", "縝": "zhen", "縫": "feng", "縮": "suo", "總": "zong", "績": "ji",
  "繁": "fan", "繃": "beng", "繆": "miu", "織": "zhi", "繕": "shan", "繞": "rao",
  "繼": "ji", "續": "xu", "纏": "chan",
  "纓": "ying", "纖": "xian", "纜": "lan", "缽": "bo", "缸": "gang", "缺": "que", "罐": "guan",
  "羅": "luo", "罰": "fa", "罷": "ba", "羊": "yang", "群": "qun", "羽": "yu",
  "翁": "weng", "翅": "chi", "翔": "xiang", "翹": "qiao", "老": "lao", "考": "kao", "者": "zhe",
  "而": "er", "耐": "nai", "耍": "shua", "耕": "geng", "耗": "hao", "耳": "er", "耶": "ye", "耷": "da",
  "聳": "song", "恥": "chi", "耽": "dan", "耿": "geng", "聊": "liao", "聆": "ling", "職": "zhi", "聯": "lian",
  "聘": "pin", "聚": "ju", "聰": "cong", "肅": "su", "肉": "rou", "肚": "du", "安": "an", "育": "yu",
  "肴": "yao", "肺": "fei", "胃": "wei", "膽": "dan", "背": "bei", "胎": "tai", "胖": "pang", "胚": "pei",
  "胞": "bao", "胡": "hu", "胯": "kua", "胰": "yi", "胳": "ge", "膠": "jiao", "胸": "xiong", "胺": "an",
  "能": "neng", "脂": "zhi", "脆": "cui", "脈": "mai", "脊": "ji", "脖": "bo", "腳": "jiao",
  "修": "xiu", "脯": "pu", "脫": "tuo", "臉": "lian", "脾": "pi", "腰": "yao", "腹": "fu", "腺": "xian",
  "腦": "nao", "膀": "pang", "膈": "ge", "膊": "bo", "膏": "gao", "膚": "fu", "膨": "peng", "膩": "ni",
  "膳": "shan", "膿": "nong", "臂": "bi", "臃": "yong", "臆": "yi", "臊": "sao", "臣": "chen",
  "臥": "wo", "臨": "lin", "自": "zi", "臭": "chou", "至": "zhi", "致": "zhi", "臻": "zhen",
  "臼": "jiu", "與": "yu", "興": "xing", "舉": "ju", "舊": "jiu", "舌": "she", "舍": "she", "舐": "shi",
  "舒": "shu", "舔": "tian", "舟": "zhou", "航": "hang", "般": "ban", "艦": "jian", "艙": "cang",
  "舵": "duo", "船": "chuan", "艇": "ting", "艘": "sou", "艚": "cao", "艟": "chong", "艮": "gen",
  "良": "liang", "艱": "jian", "色": "se", "艷": "yan", "艸": "cao", "艾": "ai", "芒": "mang",
  "芝": "zhi", "芥": "jie", "蘆": "lu", "芬": "fen", "芭": "ba", "芯": "xin", "花": "hua",
  "芳": "fang", "芷": "zhi", "芸": "yun", "芹": "qin", "芽": "ya", "葦": "wei", "莧": "xian",
  "蒼": "cang", "蘇": "su", "苑": "yuan", "苒": "ran", "苓": "ling", "苔": "tai", "苗": "miao",
  "苜": "mu", "苞": "bao", "若": "ruo", "苦": "ku", "英": "ying", "苳": "dong",
  "苹": "ping", "苻": "fu", "茁": "zhuo", "茂": "mao", "范": "fan", "茄": "qie", "茅": "mao",
  "茉": "mo", "莖": "jing", "繭": "jian", "茨": "ci", "茫": "mang", "茬": "cha", "茯": "fu",
  "茱": "zhu", "茲": "zi", "茴": "hui", "茵": "yin", "茶": "cha", "茸": "rong", "茹": "ru",
  "荊": "jing", "草": "cao", "荏": "ren", "薦": "jian", "荒": "huang", "荔": "li", "莢": "jia",
  "蕩": "dang", "榮": "rong", "葷": "hun", "滎": "xing", "螢": "ying", "營": "ying", "薩": "sa",
  "萬": "wan", "萵": "wo", "著": "zhu", "葛": "ge", "葡": "pu", "董": "dong",
  "葩": "pa", "葫": "hu", "葬": "zang", "葭": "jia", "蔥": "cong", "葳": "wei", "葵": "kui",
  "葶": "ting", "葸": "xi", "葺": "qi", "蒂": "di", "蔣": "jiang", "蒐": "sou",
  "蒔": "shi", "蒙": "meng", "蒜": "suan", "蒞": "li", "蒟": "ju", "蒡": "bang", "蒲": "pu",
  "蒸": "zheng", "蒹": "jian", "蓁": "zhen", "蓄": "xu", "蓉": "rong", "蓓": "bei", "蓍": "shi",
  "藍": "lan", "薊": "ji", "蓑": "suo", "蓬": "peng", "蓮": "lian", "蓯": "cong", "蓴": "chun",
  "蓽": "bi", "蕎": "qiao", "薈": "hui", "薺": "ji", "蕪": "wu", "蕭": "xiao", "薔": "qiang",
  "薟": "xian", "薪": "xin", "薯": "shu", "薰": "xun", "薹": "tai", "藉": "jie", "藏": "cang",
  "藐": "miao", "蘚": "xian", "藕": "ou", "藜": "li", "藝": "yi", "藤": "teng", "藥": "ya",
  "藩": "fan", "藪": "sou", "藹": "ai", "藺": "lin", "藻": "zao", "蘄": "qi", "蘊": "yun",
  "蘋": "ping", "蘑": "mo", "虜": "lu", "虐": "nue", "慮": "lu", "虔": "qian", "虛": "xu",
  "虞": "yu", "號": "hao", "虢": "guo", "蟈": "guo", "蟯": "nao", "蟬": "chan", "蠆": "chai",
  "蠍": "xie", "蠶": "can", "蠹": "du", "蠻": "man", "衄": "nü", "術": "shu",
  "衝": "chong", "衛": "wei", "衡": "heng", "衢": "qu", "衣": "yi", "補": "bu", "表": "biao",
  "衩": "cha", "衫": "shan", "襯": "chen", "衰": "shuai", "衲": "na", "衷": "zhong", "衽": "ren",
  "衾": "qin", "衿": "jin", "袁": "yuan", "袂": "mei", "袈": "jia", "袋": "dai", "袍": "pao",
  "袒": "tan", "袖": "xiu", "襪": "wa", "袞": "gun", "被": "bei", "襲": "xi", "袱": "fu",
  "裁": "cai", "裂": "lie", "裝": "zhuang", "襠": "dang", "襤": "lan", "要": "yao",
  "覆": "fu", "規": "gui", "覓": "mi", "視": "shi", "覘": "chan", "覡": "xi",
  "親": "qin", "觀": "guan", "角": "jiao",
  "觔": "jin", "解": "jie", "觸": "chu", "言": "yan", "訁": "讠", "訂": "ding", "訃": "fu",
  "計": "ji", "訊": "xun", "訌": "hong", "討": "tao", "訐": "jie", "訒": "ren", "訓": "xun",
  "訕": "shan", "起": "qi", "託": "tuo", "訛": "e", "訝": "ya", "訟": "song", "訣": "jue",
  "訥": "ne", "訪": "fang", "設": "she", "許": "xu", "訴": "su", "訶": "he", "診": "zhen",
  "註": "zhu", "証": "zheng", "詁": "gu", "低": "di", "詎": "ju", "詐": "zha", "詒": "yi",
  "詔": "zhao", "評": "ping", "詖": "bi", "詗": "xiong", "詘": "qu", "詛": "zu", "詞": "ci",
  "詠": "yong", "詡": "xu", "詢": "xun", "詣": "yi", "試": "shi", "詩": "shi", "詫": "cha",
  "詬": "gou", "詭": "gui", "詮": "quan", "該": "gai", "詳": "xiang", "詵": "shen",
  "詼": "hui", "課": "ke", "誶": "sui", "誹": "fei", "誼": "yi", "諂": "chan",
  "諄": "zhun", "談": "tan", "諉": "wei", "請": "qing", "諍": "zheng", "諏": "zou", "諑": "zhuo",
  "諒": "liang", "諛": "yu", "諜": "die", "諞": "pian", "諠": "xuan",
  "調": "tiao", "謙": "qian", "講": "jiang", "謝": "xie", "誰": "shei", "認": "ren"
};

export function normalizePinyin(text: string, tonePolicy: "ignore" | "require" | "numbers"): string {
  let res = text.trim().toLowerCase();

  if (tonePolicy === "ignore") {
    // Strip tone numbers 1-5
    res = res.replace(/[1-5]/g, "");
    // Map tone marks to base vowels
    res = res.split("").map(ch => {
      const mapped = pinyinToneMap[ch];
      return mapped ? mapped.base.toLowerCase() : ch;
    }).join("");
    return res;
  }

  if (tonePolicy === "numbers") {
    // Convert tone marks to numbers at the end of syllables
    let result = "";
    let i = 0;
    while (i < res.length) {
      const ch = res[i];
      const mapped = pinyinToneMap[ch];
      if (mapped) {
        const baseVowel = mapped.base.toLowerCase();
        const tone = mapped.tone;

        // Lookahead to find the end of the syllable:
        // Skip subsequent vowels and optional ending 'n', 'ng', 'r'
        let endIdx = i + 1;

        // 1. Skip standard vowels (a, e, i, o, u, v)
        while (endIdx < res.length && /[aeiouuv]/.test(res[endIdx])) {
          endIdx++;
        }

        // 2. Check for 'n' or 'ng' or 'r'
        if (endIdx < res.length - 1 && res[endIdx] === "n" && res[endIdx + 1] === "g") {
          endIdx += 2;
        } else if (endIdx < res.length && (res[endIdx] === "n" || res[endIdx] === "r")) {
          // Verify 'n' or 'r' is not starting a new syllable (not followed by a vowel)
          if (endIdx + 1 >= res.length || !/[aeiouuvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(res[endIdx + 1])) {
            endIdx++;
          }
        }

        // Build the syllable up to endIdx
        result += baseVowel;
        result += res.substring(i + 1, endIdx);
        result += tone;

        i = endIdx;
      } else {
        result += ch;
        i++;
      }
    }
    return result;
  }

  return res;
}

export function normalizeText(text: string, languageId: string, options: NormalizationOptions = {}): string {
  if (!text) return "";

  // 1. Unicode NFKC Normalization
  let normalized = text.normalize("NFKC");

  // 2. Full-width/Half-width alphanumeric conversion
  normalized = normalized.replace(/[\uFF01-\uFF5E]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  ).replace(/\u3000/g, " ");

  // 3. Language specific normalizations
  if (languageId === "ja") {
    if (options.kanaEquivalence) {
      // Katakana to Hiragana conversion
      normalized = normalized.replace(/[\u30a1-\u30f6]/g, (match) => {
        const charCode = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(charCode);
      });
    }
    if (options.ignoreSpaces !== false) {
      normalized = normalized.replace(/\s+/g, "");
    }
  } else if (languageId === "zh") {
    if (options.traditionalEquivalence) {
      // Convert Traditional to Simplified Chinese characters
      normalized = normalized.split("").map(ch => traditionalToSimplifiedMap[ch] || ch).join("");
    }
    if (options.tonePolicy) {
      normalized = normalizePinyin(normalized, options.tonePolicy);
    }
    if (options.ignoreSpaces !== false) {
      normalized = normalized.replace(/\s+/g, "");
    }
  } else {
    // English/fallback normalizations
    if (!options.caseSensitive) {
      normalized = normalized.toLowerCase();
    }
    normalized = normalized.trim().replace(/\s+/g, " ");
  }

  return normalized;
}
