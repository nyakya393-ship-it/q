"use strict";

/* =========================================================
   SPLATOON 3
   ブキ性能アナライザー
========================================================= */

const WIKI_BASE =
    "https://wikiwiki.jp/splatoon3mix/";

const JINA_BASE =
    "https://r.jina.ai/";


/* =========================================================
   カテゴリ
========================================================= */

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
   状態
========================================================= */

let currentCategory = "blaster";
let currentWeapons = [];
let selectedWeapon = null;

const categoryCache = new Map();


/* =========================================================
   DOM
========================================================= */

function findElement(selectors) {

    for (const selector of selectors) {

        const element =
            document.querySelector(selector);

        if (element) {
            return element;
        }
    }

    return null;
}


let categoryArea = null;
let weaponList = null;
let weaponCount = null;
let detailArea = null;
let searchInput = null;


/* =========================================================
   DOM自動検出
========================================================= */

function setupDOM() {

    searchInput =
        findElement([
            "#searchInput",
            "#weaponSearch",
            ".search-input",
            ".weapon-search",
            'input[type="search"]'
        ]);


    weaponList =
        findElement([
            "#weaponList",
            ".weapon-list",
            ".weapons-list"
        ]);


    weaponCount =
        findElement([
            "#weaponCount",
            ".weapon-count",
            "#weaponCategoryCount"
        ]);


    detailArea =
        findElement([
            "#weaponDetail",
            ".weapon-detail",
            "#detailArea",
            ".detail-area"
        ]);


    /*
       カテゴリ領域を探す
    */

    categoryArea =
        findElement([
            "#categoryButtons",
            ".category-buttons",
            ".categories",
            ".category-list"
        ]);


    /*
       見つからない場合は
       「ブキカテゴリ」という見出しを探す
    */

    if (!categoryArea) {

        const headings =
            Array.from(
                document.querySelectorAll(
                    "h1,h2,h3,h4,div,p,span"
                )
            );


        const heading =
            headings.find(
                element =>
                    element.textContent
                        .trim() ===
                    "ブキカテゴリ"
            );


        if (heading) {

            categoryArea =
                document.createElement(
                    "div"
                );

            categoryArea.className =
                "category-buttons";


            heading.parentElement.appendChild(
                categoryArea
            );

        }

    }


    /*
       それでも見つからない場合は
       ページ上部に作成
    */

    if (!categoryArea) {

        categoryArea =
            document.createElement(
                "div"
            );

        categoryArea.className =
            "category-buttons";


        const firstSection =
            document.querySelector(
                "main"
            ) ||
            document.body;


        firstSection.prepend(
            categoryArea
        );

    }
}


/* =========================================================
   HTMLエスケープ
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   数値
========================================================= */

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
        .filter(
            Number.isFinite
        );
}


/* =========================================================
   Wikiテキスト
========================================================= */

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

function wikiURL(page) {

    return (
        WIKI_BASE +
        encodeURI(page)
    );
}


function readerURL(url) {

    return (
        JINA_BASE +
        url
    );
}


/* =========================================================
   Wiki取得
========================================================= */

async function fetchWikiPage(page) {

    const url =
        wikiURL(page);


    const response =
        await fetch(
            readerURL(url),
            {
                method: "GET",
                cache: "no-store"
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
   IndexedDB
========================================================= */

const DB_NAME =
    "splatoon3_weapon_analyzer";

const DB_VERSION =
    1;

const STORE_NAME =
    "weapons";

let dbPromise = null;


function openDB() {

    if (dbPromise) {
        return dbPromise;
    }


    dbPromise =
        new Promise(
            (resolve, reject) => {

                const request =
                    indexedDB.open(
                        DB_NAME,
                        DB_VERSION
                    );


                request.onupgradeneeded =
                    () => {

                        const db =
                            request.result;


                        if (
                            !db.objectStoreNames
                                .contains(
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


                request.onsuccess =
                    () => {

                        resolve(
                            request.result
                        );

                    };


                request.onerror =
                    () => {

                        reject(
                            request.error
                        );

                    };

            }
        );


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


                request.onsuccess =
                    () => {

                        resolve(
                            request.result ||
                            null
                        );

                    };


                request.onerror =
                    () => {

                        reject(
                            request.error
                        );

                    };

            }
        );

    } catch {

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


                transaction
                    .objectStore(
                        STORE_NAME
                    )
                    .put(data);


                transaction.oncomplete =
                    resolve;


                transaction.onerror =
                    () => {

                        reject(
                            transaction.error
                        );

                    };

            }
        );

    } catch (error) {

        console.warn(
            "キャッシュ保存失敗",
            error
        );

    }
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
            text.slice(
                0,
                -1
            );

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


    const link =
        text.match(
            /\[\[([^>\]]+)>[^\]]+\]\]/
        );


    if (link) {

        text =
            link[1];

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
        cleanWikiText(
            text
        );


    const forbidden = [

        "ブキ",
        "武器",
        "一覧",
        "名称",
        "名前",
        "射程",
        "ダメージ",
        "連射速度",
        "サブ",
        "スペシャル",
        "必要ポイント"

    ];


    if (
        forbidden.includes(text)
    ) {

        return null;

    }


    if (
        !text ||
        text.length > 40
    ) {

        return null;

    }


    if (
        /^[-+]?\d+(?:\.\d+)?[FpP%]*$/
            .test(text)
    ) {

        return null;

    }


    return text;
}


/* =========================================================
   重複除去
========================================================= */

function uniqueWeapons(
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
   カテゴリ解析
========================================================= */

function parseCategory(
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

        if (
            !line.trim().startsWith("|")
        ) {
            continue;
        }


        const cells =
            splitWikiRow(
                line
            );


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


        let page =
            `ブキ/${name}`;


        const link =
            String(cells[0])
                .match(
                    /\[\[[^>\]]+>([^\]]+)\]\]/
                );


        if (link) {

            page =
                link[1]
                    .replace(
                        /&br;/g,
                        " "
                    )
                    .trim();

        }


        const values =
            cells.map(
                cleanWikiText
            );


        result.push({

            name,

            category:
                categoryId,

            page,

            url:
                wikiURL(page),

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
                values[4] ||
                null,

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


    return uniqueWeapons(
        result
    );
}


/* =========================================================
   カテゴリ読み込み
========================================================= */

async function loadCategory(
    categoryId
) {

    if (
        categoryCache.has(
            categoryId
        )
    ) {

        return categoryCache.get(
            categoryId
        );

    }


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
            uniqueWeapons(
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


    const text =
        await fetchWikiPage(
            category.page
        );


    const weapons =
        parseCategory(
            text,
            categoryId
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


    /*
       ボタンを入れるための専用ラッパー
    */

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "category-buttons-inner";


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


            wrapper.appendChild(
                button
            );

        }
    );


    categoryArea.appendChild(
        wrapper
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


    if (weaponList) {

        weaponList.innerHTML = `

            <div class="empty-weapons">

                <div class="empty-title">
                    読み込み中…
                </div>

                <div class="empty-text">
                    ブキ一覧を取得しています
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


        if (weaponCount) {

            weaponCount.textContent =
                weapons.length;

        }


    } catch (error) {

        console.error(
            error
        );


        currentWeapons = [];


        if (weaponList) {

            weaponList.innerHTML = `

                <div class="empty-weapons">

                    <div class="empty-title">
                        武器一覧を取得できませんでした
                    </div>

                    <div class="empty-text">
                        もう一度カテゴリを押してください
                    </div>

                </div>

            `;

        }

    }
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


    for (
        const weapon of weapons
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "weapon-card";


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
   武器詳細解析
========================================================= */

function parseWeaponDetail(
    text,
    basic
) {

    const data = {

        ...basic,

        sub: null,

        special: null,

        points: null,

        maxRange:
            basic.range,

        blastRange:
            basic.blastRange,

        maxDamage:
            basic.directDamage,

        minDamage: null,

        killCount: null,

        fireFrames:
            basic.fireFrames,

        blastRadius:
            basic.blastRadius,

        ktt: null,

        dps: null

    };


    const lines =
        String(text)
            .split(/\r?\n/);


    for (
        const line of lines
    ) {

        const cells =
            splitWikiRow(
                line
            );


        if (
            cells.length < 2
        ) {
            continue;
        }


        const key =
            cleanWikiText(
                cells[0]
            );


        const value =
            cleanWikiText(
                cells[1]
            );


        if (
            key.includes("サブ")
        ) {

            data.sub =
                value;

        }


        if (
            key.includes("スペシャル")
        ) {

            data.special =
                value;

        }


        if (
            key.includes("必要ポイント")
        ) {

            data.points =
                numberFrom(
                    value
                );

        }


        if (
            key.includes("有効射程")
        ) {

            data.maxRange =
                numberFrom(
                    value
                );

        }


        if (
            key.includes("ダメージ")
        ) {

            const nums =
                numbersFrom(
                    value
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


        if (
            key.includes("確定数")
        ) {

            data.killCount =
                value;

        }


        if (
            key.includes("連射フレーム")
        ) {

            data.fireFrames =
                numberFrom(
                    value
                );

        }


        if (
            key.includes("爆風範囲")
        ) {

            data.blastRadius =
                numberFrom(
                    value
                );

        }


        if (
            key === "DPS"
        ) {

            data.dps =
                numberFrom(
                    value
                );

        }


        if (
            key.includes("キルタイム")
        ) {

            data.ktt =
                numberFrom(
                    value
                );

        }

    }


    return data;
}


/* =========================================================
   武器読み込み
========================================================= */

async function loadWeapon(
    weapon
) {

    selectedWeapon =
        weapon;


    if (!detailArea) {
        return;
    }


    detailArea.innerHTML = `

        <div class="detail-loading">

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


    const cached =
        await getCachedWeapon(
            weapon.url
        );


    if (cached) {

        renderWeaponDetail(
            cached
        );

        return;
    }


    try {

        const text =
            await fetchWikiPage(
                weapon.page
            );


        const data =
            parseWeaponDetail(
                text,
                weapon
            );


        await saveCachedWeapon(
            data
        );


        renderWeaponDetail(
            data
        );


    } catch (error) {

        console.error(
            "詳細取得失敗:",
            error
        );


        renderWeaponDetail(
            weapon
        );

    }
}


/* =========================================================
   グラフ
========================================================= */

function percent(
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
            value / max * 100
        )
    );
}


function rangeGraph(data) {

    const range =
        numberFrom(
            data.maxRange ??
            data.range
        );


    const blast =
        numberFrom(
            data.blastRange
        );


    const max =
        Math.max(
            range || 0,
            blast || 0,
            5
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
                                style="width:${percent(
                                    range,
                                    max
                                )}%"
                            ></div>
                          `
                        : ""
                }

                ${
                    blast !== null
                        ? `
                            <div
                                class="blast-point"
                                style="left:${percent(
                                    blast,
                                    max
                                )}%"
                            ></div>
                          `
                        : ""
                }

            </div>

            <div class="range-values">

                <div>
                    <strong>
                        ${range ?? "—"}
                    </strong>
                    <span>
                        有効射程
                    </span>
                </div>

                <div>
                    <strong>
                        ${blast ?? "—"}
                    </strong>
                    <span>
                        爆風射程
                    </span>
                </div>

            </div>

        </div>

    `;
}


function damageGraph(data) {

    const max =
        numberFrom(
            data.maxDamage ??
            data.directDamage
        );


    const min =
        numberFrom(
            data.minDamage
        );


    if (max === null) {

        return `
            <div class="graph-empty">
                データなし
            </div>
        `;

    }


    return `

        <div class="damage-graph">

            <div class="damage-row">

                <span>
                    最大
                </span>

                <div class="damage-track">

                    <div
                        class="damage-bar"
                        style="width:${percent(
                            max,
                            100
                        )}%"
                    ></div>

                </div>

                <strong>
                    ${max}
                </strong>

            </div>


            ${
                min !== null
                    ? `
                        <div class="damage-row">

                            <span>
                                最小
                            </span>

                            <div class="damage-track">

                                <div
                                    class="damage-bar damage-min"
                                    style="width:${percent(
                                        min,
                                        100
                                    )}%"
                                ></div>

                            </div>

                            <strong>
                                ${min}
                            </strong>

                        </div>
                      `
                    : ""
            }

        </div>

    `;
}


function blastGraph(data) {

    const radius =
        numberFrom(
            data.blastRadius
        );


    if (radius === null) {

        return `
            <div class="graph-empty">
                爆風範囲データなし
            </div>
        `;

    }


    const size =
        Math.max(
            35,
            Math.min(
                130,
                radius * 90
            )
        );


    return `

        <div class="blast-graph">

            <div class="blast-axis">

                <div class="blast-line"></div>

                <div class="blast-origin">

                    <div
                        class="blast-circle"
                        style="
                            width:${size}px;
                            height:${size}px;
                        "
                    ></div>

                </div>

            </div>

            <div class="blast-label">

                爆風半径
                <strong>
                    ${radius}
                </strong>

            </div>

        </div>

    `;
}


function falloffGraph(data) {

    const max =
        numberFrom(
            data.maxDamage ??
            data.directDamage
        );


    const min =
        numberFrom(
            data.minDamage
        );


    if (max === null) {

        return `
            <div class="graph-empty">
                距離減衰データなし
            </div>
        `;

    }


    const end =
        min ?? 0;


    return `

        <div class="falloff-graph">

            <div class="falloff-y">

                <span>
                    ${max}
                </span>

                <span>
                    ${Math.round(
                        (max + end) / 2
                    )}
                </span>

                <span>
                    ${end}
                </span>

            </div>


            <div class="falloff-chart">

                <svg
                    viewBox="0 0 300 120"
                    preserveAspectRatio="none"
                >

                    <polyline
                        points="
                            0,8
                            45,12
                            90,20
                            135,34
                            180,52
                            225,75
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

                ${rangeGraph(data)}

            </section>


            ${
                data.blastRadius !== null &&
                data.blastRadius !== undefined
                    ? `
                        <section class="performance-section">

                            <h3>
                                爆風範囲
                            </h3>

                            ${blastGraph(data)}

                        </section>
                      `
                    : ""
            }


            <section class="performance-section">

                <h3>
                    ダメージ
                </h3>

                ${damageGraph(data)}

            </section>


            <section class="performance-section">

                <h3>
                    距離減衰
                </h3>

                ${falloffGraph(data)}

            </section>


            <section class="stats-grid">

                <div class="stat-card">
                    <span>最大射程</span>
                    <strong>
                        ${data.maxRange ??
                        data.range ??
                        "—"}
                    </strong>
                </div>


                <div class="stat-card">
                    <span>最大ダメージ</span>
                    <strong>
                        ${data.maxDamage ??
                        data.directDamage ??
                        "—"}
                    </strong>
                </div>


                <div class="stat-card">
                    <span>最小ダメージ</span>
                    <strong>
                        ${data.minDamage ??
                        "—"}
                    </strong>
                </div>


                <div class="stat-card">
                    <span>確定数</span>
                    <strong>
                        ${data.killCount ??
                        "—"}
                    </strong>
                </div>


                <div class="stat-card">
                    <span>連射フレーム</span>
                    <strong>
                        ${data.fireFrames ??
                        "—"}
                    </strong>
                </div>


                <div class="stat-card">
                    <span>キル速</span>
                    <strong>
                        ${data.ktt ??
                        "—"}
                    </strong>
                </div>


                <div class="stat-card">
                    <span>爆風半径</span>
                    <strong>
                        ${data.blastRadius ??
                        "—"}
                    </strong>
                </div>


                <div class="stat-card">
                    <span>スペシャル必要ポイント</span>
                    <strong>
                        ${data.points ??
                        "—"}
                    </strong>
                </div>

            </section>


            <section class="weapon-info">

                <div>
                    <span>サブ</span>
                    <strong>
                        ${escapeHTML(
                            data.sub ||
                            "—"
                        )}
                    </strong>
                </div>


                <div>
                    <span>スペシャル</span>
                    <strong>
                        ${escapeHTML(
                            data.special ||
                            "—"
                        )}
                    </strong>
                </div>

            </section>

        </section>

    `;
}


/* =========================================================
   検索セットアップ
========================================================= */

function initializeSearch() {

    setupSearch();

}


/* =========================================================
   初期化
========================================================= */

async function initialize() {

    console.log(
        "ブキ性能アナライザー開始"
    );


    /*
       まずDOMを確実に取得
    */

    setupDOM();


    /*
       カテゴリボタンを
       Wiki取得より先に表示
    */

    renderCategoryButtons();


    initializeSearch();


    /*
       初期カテゴリ
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
