/* =========================================================
   SPLATOON 3
   ブキ性能アナライザー
   app.js
========================================================= */

"use strict";

/* =========================================================
   設定
========================================================= */

const WIKI_BASE = "https://wikiwiki.jp/splatoon3mix/";
const JINA_BASE = "https://r.jina.ai/";

const CATEGORIES = [
    {
        id: "all",
        name: "すべて",
        page: null
    },
    {
        id: "shooter",
        name: "シューター",
        page: "ブキ/シューター属"
    },
    {
        id: "blaster",
        name: "ブラスター",
        page: "ブキ/ブラスター属"
    },
    {
        id: "roller",
        name: "ローラー",
        page: "ブキ/ローラー属"
    },
    {
        id: "brush",
        name: "フデ",
        page: "ブキ/フデ属"
    },
    {
        id: "charger",
        name: "チャージャー",
        page: "ブキ/チャージャー属"
    },
    {
        id: "slosher",
        name: "スロッシャー",
        page: "ブキ/スロッシャー属"
    },
    {
        id: "spinner",
        name: "スピナー",
        page: "ブキ/スピナー属"
    },
    {
        id: "maneuver",
        name: "マニューバー",
        page: "ブキ/マニューバー属"
    },
    {
        id: "shelter",
        name: "シェルター",
        page: "ブキ/シェルター属"
    },
    {
        id: "stringer",
        name: "ストリンガー",
        page: "ブキ/ストリンガー属"
    },
    {
        id: "wiper",
        name: "ワイパー",
        page: "ブキ/ワイパー属"
    }
];


/* =========================================================
   DOM
========================================================= */

const categoryArea =
    document.querySelector("#categoryButtons") ||
    document.querySelector(".category-buttons") ||
    document.querySelector(".categories");

const weaponList =
    document.querySelector("#weaponList") ||
    document.querySelector(".weapon-list");

const weaponCount =
    document.querySelector("#weaponCount") ||
    document.querySelector(".weapon-count");

const detailArea =
    document.querySelector("#weaponDetail") ||
    document.querySelector(".weapon-detail");

const searchInput =
    document.querySelector("#searchInput") ||
    document.querySelector('input[type="search"]') ||
    document.querySelector(".search-input");

const statusText =
    document.querySelector("#status") ||
    document.querySelector(".status");


/* =========================================================
   状態
========================================================= */

let currentCategory = "blaster";
let currentWeapons = [];
let selectedWeapon = null;

const categoryCache = new Map();


/* =========================================================
   IndexedDB
========================================================= */

const DB_NAME = "splatoon3_weapon_analyzer";
const DB_VERSION = 1;
const STORE_NAME = "weapons";

let dbPromise = null;


function openDB() {

    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {

        const request =
            indexedDB.open(
                DB_NAME,
                DB_VERSION
            );

        request.onupgradeneeded = () => {

            const db = request.result;

            if (
                !db.objectStoreNames.contains(
                    STORE_NAME
                )
            ) {

                db.createObjectStore(
                    STORE_NAME,
                    {
                        keyPath: "url"
                    }
                );

            }

        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };

    });

    return dbPromise;
}


async function getCachedWeapon(url) {

    try {

        const db =
            await openDB();

        return await new Promise(
            (resolve, reject) => {

                const transaction =
                    db.transaction(
                        STORE_NAME,
                        "readonly"
                    );

                const store =
                    transaction.objectStore(
                        STORE_NAME
                    );

                const request =
                    store.get(url);

                request.onsuccess = () => {
                    resolve(
                        request.result || null
                    );
                };

                request.onerror = () => {
                    reject(request.error);
                };

            }
        );

    } catch (error) {

        console.warn(
            "キャッシュ読み込み失敗:",
            error
        );

        return null;
    }
}


async function saveCachedWeapon(data) {

    try {

        const db =
            await openDB();

        await new Promise(
            (resolve, reject) => {

                const transaction =
                    db.transaction(
                        STORE_NAME,
                        "readwrite"
                    );

                const store =
                    transaction.objectStore(
                        STORE_NAME
                    );

                store.put(data);

                transaction.oncomplete =
                    resolve;

                transaction.onerror = () => {
                    reject(
                        transaction.error
                    );
                };

            }
        );

    } catch (error) {

        console.warn(
            "キャッシュ保存失敗:",
            error
        );

    }
}


/* =========================================================
   共通
========================================================= */

function setStatus(text) {

    if (statusText) {
        statusText.textContent = text;
    }

    console.log(
        "[ブキ性能アナライザー]",
        text
    );
}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/*
   数字抽出

   例:
   "2.6"
   "36.0～18.0"
   "6F"
   → 最初の数字を取得
*/

function numberFrom(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const match =
        String(value).match(
            /-?\d+(?:\.\d+)?/
        );

    if (!match) {
        return null;
    }

    const number =
        Number(match[0]);

    return Number.isFinite(number)
        ? number
        : null;
}


function numbersFrom(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return [];
    }

    const matches =
        String(value).match(
            /-?\d+(?:\.\d+)?/g
        );

    if (!matches) {
        return [];
    }

    return matches
        .map(Number)
        .filter(Number.isFinite);
}


function cleanWikiText(value) {

    if (!value) {
        return "";
    }

    let text =
        String(value);

    text =
        text.replace(
            /<[^>]*>/g,
            ""
        );

    text =
        text.replace(
            /&attachref\([^)]*\);?/gi,
            ""
        );

    text =
        text.replace(
            /&ref\([^)]*\);?/gi,
            ""
        );

    text =
        text.replace(
            /&color\([^)]*\)\{([^}]*)\};?/gi,
            "$1"
        );

    text =
        text.replace(
            /&br;?/gi,
            " "
        );

    text =
        text.replace(
            /\[\[([^>\]]+)>[^\]]+\]\]/g,
            "$1"
        );

    text =
        text.replace(
            /\[\[([^\]]+)\]\]/g,
            "$1"
        );

    text =
        text.replace(
            /\[([^\]]+)\]\([^)]+\)/g,
            "$1"
        );

    text =
        text.replace(
            /'''([^']+)'''/g,
            "$1"
        );

    text =
        text.replace(
            /''([^']+)''/g,
            "$1"
        );

    const textarea =
        document.createElement(
            "textarea"
        );

    textarea.innerHTML =
        text;

    text =
        textarea.value;

    return text
        .replace(/\s+/g, " ")
        .trim();
}


/* =========================================================
   URL
========================================================= */

function getWikiURL(page) {

    return (
        WIKI_BASE +
        encodeURI(page)
    );
}


function getReaderURL(url) {

    return (
        JINA_BASE +
        url
    );
}


/* =========================================================
   Wiki取得
========================================================= */

async function fetchWikiPage(page) {

    const wikiURL =
        getWikiURL(page);

    const readerURL =
        getReaderURL(wikiURL);

    console.log(
        "取得:",
        readerURL
    );

    const response =
        await fetch(
            readerURL,
            {
                method: "GET",
                cache: "no-store",
                headers: {
                    "Accept":
                        "text/plain"
                }
            }
        );

    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}`
        );

    }

    const text =
        await response.text();

    if (
        !text ||
        text.trim().length < 10
    ) {

        throw new Error(
            "ページ内容が空です"
        );

    }

    return text;
}


/* =========================================================
   PukiWiki表
========================================================= */

function splitWikiRow(line) {

    let text =
        String(line).trim();

    if (
        !text.includes("|")
    ) {
        return [];
    }

    if (
        text.startsWith("|")
    ) {
        text =
            text.slice(1);
    }

    if (
        text.endsWith("|")
    ) {
        text =
            text.slice(0, -1);
    }

    return text.split("|");
}


/* =========================================================
   武器名
========================================================= */

function extractWeaponName(cell) {

    if (!cell) {
        return null;
    }

    let text =
        String(cell);

    text =
        text.replace(
            /&attachref\([^)]*\);?/gi,
            ""
        );

    text =
        text.replace(
            /&ref\([^)]*\);?/gi,
            ""
        );


    const linked =
        text.match(
            /\[\[([^>\]]+)>[^\]]+\]\]/
        );

    if (linked) {

        text =
            linked[1];

    } else {

        const simple =
            text.match(
                /\[\[([^\]]+)\]\]/
            );

        if (simple) {
            text =
                simple[1];
        }

    }


    text =
        text.replace(
            /&br;/gi,
            " "
        );

    text =
        cleanWikiText(text);


    /*
       表の装飾記号
    */

    text =
        text.replace(
            /^#.*$/,
            ""
        );

    text =
        text.trim();


    if (!text) {
        return null;
    }


    /*
       見出し・説明を除外
    */

    const forbidden = [
        "ブキ",
        "武器",
        "メインウェポン",
        "一覧",
        "性能",
        "詳細",
        "名前",
        "名称",
        "射程",
        "直撃射程",
        "爆風射程",
        "ダメージ",
        "連射速度",
        "連射フレーム",
        "サブ",
        "スペシャル",
        "必要ポイント",
        "コメント",
        "アップデート履歴"
    ];

    if (
        forbidden.includes(text)
    ) {
        return null;
    }


    /*
       明らかに数値だけのセルを除外
    */

    if (
        /^[-+]?[\d.]+[F%pP]*$/.test(
            text
        )
    ) {
        return null;
    }


    /*
       URLなどを除外
    */

    if (
        /^https?:\/\//.test(text)
    ) {
        return null;
    }


    /*
       長すぎる文章を除外
    */

    if (
        text.length > 40
    ) {
        return null;
    }


    return text;
}


/* =========================================================
   PukiWiki武器表解析
========================================================= */

function parsePukiWikiTable(
    text,
    categoryId
) {

    const result = [];

    const lines =
        String(text)
            .split(/\r?\n/);

    let foundList =
        false;

    for (
        let i = 0;
        i < lines.length;
        i++
    ) {

        const line =
            lines[i].trim();


        /*
           一覧セクション
        */

        if (
            line.startsWith("*") &&
            line.includes("一覧")
        ) {

            foundList = true;

            continue;
        }


        /*
           一覧前でも表が始まっていたら
           解析できるようにする
        */

        if (
            !foundList &&
            !line.startsWith("|")
        ) {

            continue;
        }


        /*
           次の見出し
        */

        if (
            foundList &&
            line.startsWith("*") &&
            !line.startsWith("|")
        ) {

            foundList = false;

            continue;
        }


        if (
            !line.startsWith("|")
        ) {
            continue;
        }


        const cells =
            splitWikiRow(line);


        if (
            cells.length < 2
        ) {
            continue;
        }


        const name =
            extractWeaponName(
                cells[0]
            );


        if (!name) {
            continue;
        }


        /*
           ブラスター表などでは

           武器名
           射程
           爆風射程
           最大ダメージ
           爆風ダメージ
           連射
           爆風範囲

           の順
        */

        const values =
            cells.map(
                cell =>
                    cleanWikiText(
                        cell
                    )
            );


        const range =
            numberFrom(
                values[1]
            );

        const blastRange =
            numberFrom(
                values[2]
            );

        const directDamage =
            numberFrom(
                values[3]
            );

        const blastDamage =
            values[4] || null;

        const fireFrames =
            numberFrom(
                values[5]
            );

        const blastRadius =
            numberFrom(
                values[6]
            );


        /*
           個別ページURL

           [[武器名>ブキ/ページ名]]
           がある場合にも対応
        */

        let pageName =
            `ブキ/${name}`;


        const originalCell =
            String(cells[0]);


        const pageLink =
            originalCell.match(
                /\[\[[^>\]]+>([^\]]+)\]\]/
            );


        if (pageLink) {

            pageName =
                pageLink[1]
                    .replace(
                        /&br;/g,
                        " "
                    )
                    .trim();

        }


        result.push({

            name,

            category:
                categoryId,

            page:
                pageName,

            url:
                getWikiURL(
                    pageName
                ),

            range,

            blastRange,

            directDamage,

            blastDamage,

            fireFrames,

            blastRadius

        });

    }


    return removeDuplicateWeapons(
        result
    );
}


/* =========================================================
   Markdown表解析
========================================================= */

function parseMarkdownTable(
    text,
    categoryId
) {

    const result = [];

    const lines =
        String(text)
            .split(/\r?\n/);


    for (
        const line of lines
    ) {

        const trimmed =
            line.trim();


        if (
            !trimmed.startsWith("|")
        ) {
            continue;
        }


        const cells =
            splitWikiRow(
                trimmed
            );


        if (
            cells.length < 2
        ) {
            continue;
        }


        /*
           Markdown区切り行
        */

        if (
            cells.every(
                cell =>
                    /^[-:\s]+$/.test(
                        cell
                    )
            )
        ) {

            continue;
        }


        const name =
            extractWeaponName(
                cells[0]
            );


        if (!name) {
            continue;
        }


        const values =
            cells.map(
                cell =>
                    cleanWikiText(
                        cell
                    )
            );


        const pageName =
            `ブキ/${name}`;


        result.push({

            name,

            category:
                categoryId,

            page:
                pageName,

            url:
                getWikiURL(
                    pageName
                ),

            range:
                numberFrom(
                    values[1]
                ),

            blastRange:
                numberFrom(
                    values[2]
                ),

            directDamage:
                numberFrom(
                    values[3]
                ),

            blastDamage:
                values[4] || null,

            fireFrames:
                numberFrom(
                    values[5]
                ),

            blastRadius:
                numberFrom(
                    values[6]
                )

        });

    }


    return removeDuplicateWeapons(
        result
    );
}


/* =========================================================
   HTML表解析
========================================================= */

function parseHTMLTable(
    text,
    categoryId
) {

    const result = [];

    const container =
        document.createElement(
            "div"
        );

    container.innerHTML =
        text;


    const rows =
        container.querySelectorAll(
            "tr"
        );


    rows.forEach(
        row => {

            const cells =
                Array.from(
                    row.querySelectorAll(
                        "th, td"
                    )
                );


            if (
                cells.length < 2
            ) {
                return;
            }


            const name =
                extractWeaponName(
                    cells[0].textContent
                );


            if (!name) {
                return;
            }


            result.push({

                name,

                category:
                    categoryId,

                page:
                    `ブキ/${name}`,

                url:
                    getWikiURL(
                        `ブキ/${name}`
                    ),

                range:
                    numberFrom(
                        cells[1]?.textContent
                    ),

                blastRange:
                    numberFrom(
                        cells[2]?.textContent
                    ),

                directDamage:
                    numberFrom(
                        cells[3]?.textContent
                    ),

                blastDamage:
                    cells[4]?.textContent ||
                    null,

                fireFrames:
                    numberFrom(
                        cells[5]?.textContent
                    ),

                blastRadius:
                    numberFrom(
                        cells[6]?.textContent
                    )

            });

        }
    );


    return removeDuplicateWeapons(
        result
    );
}


/* =========================================================
   重複除去
========================================================= */

function removeDuplicateWeapons(
    weapons
) {

    const map =
        new Map();


    for (
        const weapon of weapons
    ) {

        if (
            !map.has(
                weapon.name
            )
        ) {

            map.set(
                weapon.name,
                weapon
            );

        }

    }


    return Array.from(
        map.values()
    ).sort(
        (a, b) =>
            a.name.localeCompare(
                b.name,
                "ja"
            )
    );
}


/* =========================================================
   カテゴリ取得
========================================================= */

async function loadCategory(
    categoryId
) {

    /*
       キャッシュ済みなら使用
    */

    if (
        categoryCache.has(
            categoryId
        )
    ) {

        return categoryCache.get(
            categoryId
        );

    }


    /*
       すべて
    */

    if (
        categoryId === "all"
    ) {

        const all = [];


        for (
            const category
            of CATEGORIES
        ) {

            if (
                category.id === "all"
            ) {
                continue;
            }


            try {

                const weapons =
                    await loadCategory(
                        category.id
                    );

                all.push(
                    ...weapons
                );

            } catch (error) {

                console.warn(
                    category.name,
                    error
                );

            }

        }


        const result =
            removeDuplicateWeapons(
                all
            );


        categoryCache.set(
            categoryId,
            result
        );


        return result;
    }


    const category =
        CATEGORIES.find(
            item =>
                item.id === categoryId
        );


    if (!category) {
        return [];
    }


    setStatus(
        `${category.name}を読み込み中…`
    );


    const text =
        await fetchWikiPage(
            category.page
        );


    console.log(
        "Wiki取得文字数:",
        text.length
    );


    /*
       PukiWiki
    */

    let weapons =
        parsePukiWikiTable(
            text,
            categoryId
        );


    /*
       Markdown
    */

    if (
        weapons.length === 0
    ) {

        weapons =
            parseMarkdownTable(
                text,
                categoryId
            );

    }


    /*
       HTML
    */

    if (
        weapons.length === 0
    ) {

        weapons =
            parseHTMLTable(
                text,
                categoryId
            );

    }


    console.log(
        `${category.name}:`,
        weapons.length,
        "種類"
    );


    categoryCache.set(
        categoryId,
        weapons
    );


    return weapons;
}


/* =========================================================
   カテゴリボタン
========================================================= */

function renderCategoryButtons() {

    if (!categoryArea) {
        return;
    }


    categoryArea.innerHTML = "";


    CATEGORIES.forEach(
        category => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "category-button";


            button.dataset.category =
                category.id;


            button.textContent =
                category.name;


            if (
                category.id ===
                currentCategory
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.addEventListener(
                "click",
                () => {

                    selectCategory(
                        category.id
                    );

                }
            );


            categoryArea.appendChild(
                button
            );

        }
    );
}


/* =========================================================
   カテゴリ選択
========================================================= */

async function selectCategory(
    categoryId
) {

    currentCategory =
        categoryId;


    /*
       ボタン状態
    */

    document
        .querySelectorAll(
            ".category-button"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.category ===
                    categoryId
                );

            }
        );


    /*
       一覧を一旦ローディング
    */

    if (weaponList) {

        weaponList.innerHTML = `
            <div class="empty-weapons">
                <div class="empty-icon">
                    …
                </div>

                <div class="empty-title">
                    武器一覧を読み込み中
                </div>

                <div class="empty-text">
                    WikiWikiからデータを取得しています
                </div>
            </div>
        `;

    }


    try {

        const weapons =
            await loadCategory(
                categoryId
            );


        currentWeapons =
            weapons;


        renderWeaponList(
            weapons
        );


        updateCategoryCount(
            categoryId,
            weapons.length
        );


        setStatus(
            `${weapons.length}種類の武器を読み込みました`
        );


    } catch (error) {

        console.error(
            "カテゴリ取得エラー:",
            error
        );


        currentWeapons = [];


        if (weaponList) {

            weaponList.innerHTML = `
                <div class="empty-weapons">
                    <div class="empty-icon">
                        !
                    </div>

                    <div class="empty-title">
                        武器一覧を取得できませんでした
                    </div>

                    <div class="empty-text">
                        ページを再読み込みして、もう一度試してください
                    </div>
                </div>
            `;

        }


        updateCategoryCount(
            categoryId,
            0
        );


        setStatus(
            "武器一覧の取得に失敗しました"
        );

    }
}


/* =========================================================
   件数
========================================================= */

function updateCategoryCount(
    categoryId,
    count
) {

    /*
       data-category-count
    */

    document
        .querySelectorAll(
            "[data-category-count]"
        )
        .forEach(
            element => {

                if (
                    element.dataset.categoryCount ===
                    categoryId
                ) {

                    element.textContent =
                        count;

                }

            }
        );


    /*
       既存ヘッダー対応
    */

    const categoryCount =
        document.querySelector(
            ".category-count"
        );


    if (
        categoryCount
    ) {

        const category =
            CATEGORIES.find(
                item =>
                    item.id ===
                    categoryId
            );


        if (category) {

            categoryCount.textContent =
                `${category.name}：${count}種類`;

        }

    }


    /*
       よくあるIDにも対応
    */

    const countElements = [
        "#categoryCount",
        "#weaponCategoryCount"
    ];


    countElements.forEach(
        selector => {

            const element =
                document.querySelector(
                    selector
                );


            if (element) {

                element.textContent =
                    count;

            }

        }
    );
}


/* =========================================================
   武器一覧
========================================================= */

function renderWeaponList(
    weapons
) {

    if (!weaponList) {
        return;
    }


    weaponList.innerHTML = "";


    if (weaponCount) {

        weaponCount.textContent =
            weapons.length;

    }


    if (
        weapons.length === 0
    ) {

        weaponList.innerHTML = `
            <div class="empty-weapons">

                <div class="empty-icon">
                    ＋
                </div>

                <div class="empty-title">
                    武器がありません
                </div>

                <div class="empty-text">
                    上のカテゴリを選択してください
                </div>

            </div>
        `;

        return;
    }


    weapons.forEach(
        weapon => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "weapon-card";


            button.dataset.weapon =
                weapon.name;


            button.innerHTML = `

                <div class="weapon-card-name">
                    ${escapeHTML(
                        weapon.name
                    )}
                </div>

                <div class="weapon-card-stats">

                    ${
                        weapon.range !== null
                            ? `
                                <span>
                                    射程 ${weapon.range}
                                </span>
                              `
                            : ""
                    }

                    ${
                        weapon.directDamage !== null
                            ? `
                                <span>
                                    ${weapon.directDamage}ダメ
                                </span>
                              `
                            : ""
                    }

                    ${
                        weapon.blastRadius !== null
                            ? `
                                <span>
                                    爆風 ${weapon.blastRadius}
                                </span>
                              `
                            : ""
                    }

                </div>

            `;


            button.addEventListener(
                "click",
                () => {

                    loadWeapon(
                        weapon
                    );

                }
            );


            weaponList.appendChild(
                button
            );

        }
    );
}


/* =========================================================
   検索
========================================================= */

function setupSearch() {

    if (!searchInput) {
        return;
    }


    searchInput.addEventListener(
        "input",
        () => {

            const query =
                searchInput.value
                    .trim()
                    .toLowerCase();


            if (!query) {

                renderWeaponList(
                    currentWeapons
                );

                return;
            }


            const filtered =
                currentWeapons.filter(
                    weapon =>
                        weapon.name
                            .toLowerCase()
                            .includes(
                                query
                            )
                );


            renderWeaponList(
                filtered
            );

        }
    );
}


/* =========================================================
   個別ページ解析
========================================================= */

function parseWeaponDetail(
    text,
    basic
) {

    const data = {

        ...basic,

        rawText:
            text,

        sub:
            null,

        special:
            null,

        points:
            null,

        maxRange:
            basic.range,

        blastRange:
            basic.blastRange,

        maxDamage:
            basic.directDamage,

        minDamage:
            null,

        killCount:
            null,

        fireFrames:
            basic.fireFrames,

        blastRadius:
            basic.blastRadius,

        paintRange:
            null,

        dps:
            null,

        ktt:
            null

    };


    const lines =
        String(text)
            .split(/\r?\n/);


    for (
        const line
        of lines
    ) {

        const clean =
            cleanWikiText(
                line
            );


        /*
           サブ
        */

        if (
            line.includes(
                "サブ"
            ) &&
            !line.includes(
                "サブ性能"
            )
        ) {

            const cells =
                splitWikiRow(
                    line
                );


            if (
                cells.length >= 2
            ) {

                data.sub =
                    cleanWikiText(
                        cells[1]
                    );

            }

        }


        /*
           スペシャル
        */

        if (
            line.includes(
                "スペシャル"
            )
        ) {

            const cells =
                splitWikiRow(
                    line
                );


            if (
                cells.length >= 2
            ) {

                data.special =
                    cleanWikiText(
                        cells[1]
                    );

            }

        }


        /*
           必要ポイント
        */

        if (
            line.includes(
                "必要ポイント"
            ) ||
            line.includes(
                "必要P"
            )
        ) {

            const cells =
                splitWikiRow(
                    line
                );


            if (
                cells.length >= 2
            ) {

                data.points =
                    numberFrom(
                        cells[1]
                    );

            }

        }


        /*
           有効射程
        */

        if (
            line.includes(
                "有効射程"
            )
        ) {

            const cells =
                splitWikiRow(
                    line
                );


            if (
                cells.length >= 2
            ) {

                data.maxRange =
                    numberFrom(
                        cells[1]
                    );

            }

        }


        /*
           ダメージ
        */

        if (
            line.includes(
                "ダメージ"
            )
        ) {

            const cells =
                splitWikiRow(
                    line
                );


            if (
                cells.length >= 2
            ) {

                const nums =
                    numbersFrom(
                        cells[1]
                    );


                if (
                    nums.length >= 1
                ) {

                    data.maxDamage =
                        nums[0];

                }


                if (
                    nums.length >= 2
                ) {

                    data.minDamage =
                        nums[
                            nums.length - 1
                        ];

                }

            }

        }


        /*
           確定数
        */

        if (
            line.includes(
                "確定数"
            )
        ) {

            const cells =
                splitWikiRow(
                    line
                );


            if (
                cells.length >= 2
            ) {

                data.killCount =
                    cleanWikiText(
                        cells[1]
                    );

            }

        }


        /*
           連射フレーム
        */

        if (
            line.includes(
                "連射フレーム"
            )
        ) {

            const cells =
                splitWikiRow(
                    line
                );


            if (
                cells.length >= 2
            ) {

                data.fireFrames =
                    numberFrom(
                        cells[1]
                    );

            }

        }


        /*
           爆風範囲
        */

        if (
            line.includes(
                "爆風範囲"
            )
        ) {

            const cells =
                splitWikiRow(
                    line
                );


            if (
                cells.length >= 2
            ) {

                data.blastRadius =
                    numberFrom(
                        cells[1]
                    );

            }

        }


        /*
           DPS
        */

        if (
            /\bDPS\b/i.test(
                line
            )
        ) {

            const cells =
                splitWikiRow(
                    line
                );


            if (
                cells.length >= 2
            ) {

                data.dps =
                    numberFrom(
                        cells[1]
                    );

            }

        }


        /*
           キルタイム
        */

        if (
            line.includes(
                "キルタイム"
            )
        ) {

            const cells =
                splitWikiRow(
                    line
                );


            if (
                cells.length >= 2
            ) {

                data.ktt =
                    numberFrom(
                        cells[1]
                    );

            }

        }

    }


    return data;
}


/* =========================================================
   武器詳細取得
========================================================= */

async function loadWeapon(
    weapon
) {

    selectedWeapon =
        weapon;


    if (!detailArea) {
        return;
    }


    /*
       ローディング
    */

    detailArea.innerHTML = `

        <div class="detail-loading">

            <div class="loading-mark">
                …
            </div>

            <div>
                ${escapeHTML(
                    weapon.name
                )}
            </div>

            <small>
                性能データを取得中…
            </small>

        </div>

    `;


    /*
       IndexedDB
    */

    const cached =
        await getCachedWeapon(
            weapon.url
        );


    if (cached) {

        console.log(
            "キャッシュ使用:",
            weapon.name
        );


        renderWeaponDetail(
            cached
        );


        setStatus(
            `${weapon.name}をキャッシュから読み込みました`
        );


        return;
    }


    try {

        setStatus(
            `${weapon.name}の性能データを取得中…`
        );


        const response =
            await fetch(
                getReaderURL(
                    weapon.url
                ),
                {
                    method: "GET",
                    cache: "no-store",
                    headers: {
                        "Accept":
                            "text/plain"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const text =
            await response.text();


        const detail =
            parseWeaponDetail(
                text,
                weapon
            );


        await saveCachedWeapon(
            detail
        );


        renderWeaponDetail(
            detail
        );


        setStatus(
            `${weapon.name}を読み込みました`
        );


    } catch (error) {

        console.error(
            "武器詳細取得失敗:",
            error
        );


        /*
           一覧から取得したデータだけでも表示
        */

        renderWeaponDetail(
            weapon
        );


        setStatus(
            "詳細データの取得に失敗しました"
        );

    }
}


/* =========================================================
   グラフ
========================================================= */

function percentage(
    value,
    max
) {

    if (
        value === null ||
        value === undefined ||
        !max
    ) {

        return 0;

    }


    return Math.max(
        0,
        Math.min(
            100,
            (value / max) * 100
        )
    );
}


/* =========================================================
   射程グラフ
========================================================= */

function createRangeGraph(
    data
) {

    const range =
        numberFrom(
            data.maxRange ??
            data.range
        );


    const blastRange =
        numberFrom(
            data.blastRange
        );


    if (
        range === null &&
        blastRange === null
    ) {

        return `
            <div class="graph-empty">
                射程データなし
            </div>
        `;

    }


    const max =
        Math.max(
            range || 0,
            blastRange || 0,
            5
        );


    const rangePercent =
        percentage(
            range,
            max
        );


    const blastPercent =
        percentage(
            blastRange,
            max
        );


    return `

        <div class="range-graph">

            <div class="range-scale">
                <span>0</span>
                <span>${max}</span>
            </div>


            <div class="range-track">

                ${
                    range !== null
                        ? `
                            <div
                                class="range-bar"
                                style="
                                    width:${rangePercent}%;
                                "
                            ></div>
                          `
                        : ""
                }


                ${
                    blastRange !== null
                        ? `
                            <div
                                class="blast-point"
                                style="
                                    left:${blastPercent}%;
                                "
                            ></div>
                          `
                        : ""
                }

            </div>


            <div class="range-values">

                ${
                    range !== null
                        ? `
                            <div>
                                <strong>
                                    ${range}
                                </strong>

                                <span>
                                    有効射程
                                </span>
                            </div>
                          `
                        : ""
                }


                ${
                    blastRange !== null
                        ? `
                            <div>
                                <strong>
                                    ${blastRange}
                                </strong>

                                <span>
                                    爆風射程
                                </span>
                            </div>
                          `
                        : ""
                }

            </div>

        </div>

    `;
}


/* =========================================================
   爆風
========================================================= */

function createBlastGraph(
    data
) {

    const range =
        numberFrom(
            data.maxRange ??
            data.range
        );


    const radius =
        numberFrom(
            data.blastRadius
        );


    if (
        range === null ||
        radius === null
    ) {

        return `
            <div class="graph-empty">
                爆風範囲データなし
            </div>
        `;

    }


    const circleSize =
        Math.max(
            30,
            Math.min(
                140,
                radius * 90
            )
        );


    return `

        <div class="blast-graph">

            <div class="blast-axis">

                <div
                    class="blast-line"
                    style="width:70%;"
                ></div>


                <div
                    class="blast-origin"
                    style="left:70%;"
                >

                    <div
                        class="blast-circle"
                        style="
                            width:${circleSize}px;
                            height:${circleSize}px;
                        "
                    ></div>

                </div>

            </div>


            <div class="blast-label">

                射程
                <strong>
                    ${range}
                </strong>

                ＋

                爆風半径
                <strong>
                    ${radius}
                </strong>

            </div>

        </div>

    `;
}


/* =========================================================
   ダメージ
========================================================= */

function createDamageGraph(
    data
) {

    const maxDamage =
        numberFrom(
            data.maxDamage ??
            data.directDamage
        );


    const minDamage =
        numberFrom(
            data.minDamage
        );


    if (
        maxDamage === null
    ) {

        return `
            <div class="graph-empty">
                ダメージデータなし
            </div>
        `;

    }


    const max =
        Math.max(
            100,
            maxDamage,
            minDamage || 0
        );


    const maxWidth =
        percentage(
            maxDamage,
            max
        );


    const minWidth =
        percentage(
            minDamage,
            max
        );


    return `

        <div class="damage-graph">

            <div class="damage-row">

                <span>
                    最大
                </span>


                <div class="damage-track">

                    <div
                        class="damage-bar"
                        style="
                            width:${maxWidth}%;
                        "
                    ></div>

                </div>


                <strong>
                    ${maxDamage}
                </strong>

            </div>


            ${
                minDamage !== null
                    ? `
                        <div class="damage-row">

                            <span>
                                最小
                            </span>


                            <div class="damage-track">

                                <div
                                    class="damage-bar damage-min"
                                    style="
                                        width:${minWidth}%;
                                    "
                                ></div>

                            </div>


                            <strong>
                                ${minDamage}
                            </strong>

                        </div>
                      `
                    : ""
            }

        </div>

    `;
}


/* =========================================================
   距離減衰
========================================================= */

function createFalloffGraph(
    data
) {

    const maxDamage =
        numberFrom(
            data.maxDamage ??
            data.directDamage
        );


    const minDamage =
        numberFrom(
            data.minDamage
        );


    if (
        maxDamage === null
    ) {

        return `
            <div class="graph-empty">
                距離減衰データなし
            </div>
        `;

    }


    const endDamage =
        minDamage !== null
            ? minDamage
            : 0;


    return `

        <div class="falloff-graph">

            <div class="falloff-y">

                <span>
                    ${maxDamage}
                </span>

                <span>
                    ${Math.round(
                        (
                            maxDamage +
                            endDamage
                        ) / 2
                    )}
                </span>

                <span>
                    ${endDamage}
                </span>

            </div>


            <div class="falloff-chart">

                <svg
                    viewBox="0 0 300 120"
                    preserveAspectRatio="none"
                >

                    <polyline
                        points="
                            0,10
                            50,15
                            100,25
                            150,40
                            200,60
                            250,82
                            300,105
                        "
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                    />

                </svg>


                <div class="falloff-x">

                    <span>
                        近距離
                    </span>

                    <span>
                        遠距離
                    </span>

                </div>

            </div>

        </div>

    `;
}


/* =========================================================
   詳細表示
========================================================= */

function renderWeaponDetail(
    data
) {

    if (!detailArea) {
        return;
    }


    const range =
        data.maxRange ??
        data.range;


    const blastRange =
        data.blastRange;


    const maxDamage =
        data.maxDamage ??
        data.directDamage;


    detailArea.innerHTML = `

        <section class="weapon-detail-card">


            <div class="detail-header">

                <div>

                    <div class="detail-category">
                        ${escapeHTML(
                            data.category ||
                            ""
                        )}
                    </div>


                    <h2>
                        ${escapeHTML(
                            data.name ||
                            "武器"
                        )}
                    </h2>

                </div>

            </div>


            <section class="performance-section">

                <h3>
                    射程
                </h3>

                ${createRangeGraph(
                    data
                )}

            </section>


            ${
                data.blastRadius !== null &&
                data.blastRadius !== undefined
                    ? `
                        <section class="performance-section">

                            <h3>
                                爆風範囲
                            </h3>

                            ${createBlastGraph(
                                data
                            )}

                        </section>
                      `
                    : ""
            }


            <section class="performance-section">

                <h3>
                    ダメージ
                </h3>

                ${createDamageGraph(
                    data
                )}

            </section>


            <section class="performance-section">

                <h3>
                    距離減衰
                </h3>

                ${createFalloffGraph(
                    data
                )}

            </section>


            <section class="stats-grid">


                <div class="stat-card">

                    <span>
                        最大射程
                    </span>

                    <strong>
                        ${range ?? "—"}
                    </strong>

                </div>


                <div class="stat-card">

                    <span>
                        爆風射程
                    </span>

                    <strong>
                        ${blastRange ?? "—"}
                    </strong>

                </div>


                <div class="stat-card">

                    <span>
                        最大ダメージ
                    </span>

                    <strong>
                        ${maxDamage ?? "—"}
                    </strong>

                </div>


                <div class="stat-card">

                    <span>
                        最小ダメージ
                    </span>

                    <strong>
                        ${data.minDamage ?? "—"}
                    </strong>

                </div>


                <div class="stat-card">

                    <span>
                        確定数
                    </span>

                    <strong>
                        ${data.killCount ?? "—"}
                    </strong>

                </div>


                <div class="stat-card">

                    <span>
                        連射フレーム
                    </span>

                    <strong>
                        ${data.fireFrames ?? "—"}
                    </strong>

                </div>


                <div class="stat-card">

                    <span>
                        キル速
                    </span>

                    <strong>
                        ${data.ktt ?? "—"}
                    </strong>

                </div>


                <div class="stat-card">

                    <span>
                        爆風半径
                    </span>

                    <strong>
                        ${data.blastRadius ?? "—"}
                    </strong>

                </div>


            </section>


            <section class="weapon-info">


                <div>

                    <span>
                        サブ
                    </span>

                    <strong>
                        ${escapeHTML(
                            data.sub || "—"
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        スペシャル
                    </span>

                    <strong>
                        ${escapeHTML(
                            data.special || "—"
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        スペシャル必要ポイント
                    </span>

                    <strong>
                        ${
                            data.points ??
                            "—"
                        }
                    </strong>

                </div>


            </section>


        </section>

    `;
}


/* =========================================================
   初期化
========================================================= */

async function initialize() {

    setStatus(
        "初期化中…"
    );


    /*
       カテゴリを先に描画
       Wiki取得を待たせない
    */

    renderCategoryButtons();


    setupSearch();


    /*
       ブラスターを初期表示
    */

    await selectCategory(
        "blaster"
    );

}


/* =========================================================
   起動
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

} else {

    initialize();

}
