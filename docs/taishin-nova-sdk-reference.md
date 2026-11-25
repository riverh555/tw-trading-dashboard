# 台新證券 Nova API SDK 文件（事前準備 + SDK Reference）

> 來源：<https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/prepare>
> 抓取時間：2026/11/25 下午4:00:51（台北時間）
> 本檔由官方 Docusaurus 頁面合成的離線參考；僅供本專案台新 NOVA 串接參考，版權屬台新綜合證券。

## 目錄

1. [事前準備](#sec01)
2. [錯誤處理](#sec02)
3. [Python · 登入](#sec03)
4. [Python · 交易 · PlaceOrder](#sec04)
5. [Python · 交易 · GetOrderResults](#sec05)
6. [Python · 交易 · ModifyPrice](#sec06)
7. [Python · 交易 · ModifyQuantity](#sec07)
8. [Python · 交易 · GetFilled](#sec08)
9. [Python · 交易 · GetFilledDetail](#sec09)
10. [Python · 交易 · OrderHistory](#sec10)
11. [Python · 交易 · FilledHistory](#sec11)
12. [Python · 交易 · FilledHistoryDetail](#sec12)
13. [Python · 交易 · MarginQuota](#sec13)
14. [Python · 交易 · ShortDayTradeQuota](#sec14)
15. [Python · 交易 · QueryAttentionStock](#sec15)
16. [Python · 交易 · QueryDispositionStock](#sec16)
17. [Python · 帳務 · AccountTotalPnL](#sec17)
18. [Python · 帳務 · Inventories](#sec18)
19. [Python · 帳務 · TodayTradeSummary](#sec19)
20. [Python · 帳務 · RealizedPnLDetail](#sec20)
21. [Python · 帳務 · AccountStatement](#sec21)
22. [Python · 帳務 · QueryHistorySettlement](#sec22)
23. [Python · 帳務 · QueryTodaySettlement](#sec23)
24. [Python · 帳務 · Balance](#sec24)
25. [Python · 帳務 · SKBankBalance](#sec25)
26. [Python · 取得交易日](#sec26)
27. [Python · 參數對照表](#sec27)
28. [Python · API 資格開通](#sec28)
29. [Node.js · 登入](#sec29)
30. [Node.js · 交易 · PlaceOrder](#sec30)
31. [Node.js · 交易 · GetOrderResults](#sec31)
32. [Node.js · 交易 · ModifyPrice](#sec32)
33. [Node.js · 交易 · ModifyQuantity](#sec33)
34. [Node.js · 交易 · GetFilled](#sec34)
35. [Node.js · 交易 · GetFilledDetail](#sec35)
36. [Node.js · 交易 · OrderHistory](#sec36)
37. [Node.js · 交易 · FilledHistory](#sec37)
38. [Node.js · 交易 · FilledHistoryDetail](#sec38)
39. [Node.js · 交易 · MarginQuota](#sec39)
40. [Node.js · 交易 · ShortDayTradeQuota](#sec40)
41. [Node.js · 交易 · QueryAttentionStock](#sec41)
42. [Node.js · 交易 · QueryDispositionStock](#sec42)
43. [Node.js · 帳務 · AccountTotalPnL](#sec43)
44. [Node.js · 帳務 · Inventories](#sec44)
45. [Node.js · 帳務 · TodayTradeSummary](#sec45)
46. [Node.js · 帳務 · RealizedPnLDetail](#sec46)
47. [Node.js · 帳務 · AccountStatement](#sec47)
48. [Node.js · 帳務 · QueryHistorySettlement](#sec48)
49. [Node.js · 帳務 · QueryTodaySettlement](#sec49)
50. [Node.js · 帳務 · Balance](#sec50)
51. [Node.js · 帳務 · SKBankBalance](#sec51)
52. [Node.js · 取得交易日](#sec52)
53. [Node.js · 參數對照表](#sec53)
54. [Node.js · API 資格開通](#sec54)

---

<a id="sec01"></a>
## 01 事前準備

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/prepare

> **注意：**
> 開始 Nova API 前，須完成以下步驟

- 完成線上開戶 [線上開戶](https://eopen.tssco.com.tw/eopen/#/select-opentype-ledgerbank?ReferralOffice=174&ReferralCompany=8&ReferralCode=J1154529&MProId=fugle&SaleEmpId=J1154529&Source=fugle&Cooperation=&user=api)

- 申請憑證

- 簽署 API 使用風險暨聲明書

- 完成 API 認證（未開通過台新 API 者，首次登入時執行）

### 完成線上開戶

若您已有台新證券帳戶請跳過此步驟，若尚未開戶請點選 [線上開戶](https://eopen.tssco.com.tw/eopen/#/select-opentype-ledgerbank?ReferralOffice=174&ReferralCompany=8&ReferralCode=J1154529&MProId=fugle&SaleEmpId=J1154529&Source=fugle&Cooperation=&user=api)

### 申請憑證

至 [憑證申請專區](https://www.tssco.com.tw/CAinfo)，使用「**憑證e管家**」申請並匯出憑證（Windows 與 Mac 皆有提供）。

> **注意：**
> 請務必使用「憑證e管家」申請與匯出憑證；「憑證快遞」不支援 API，以其處理的憑證將無法用於 API 登入。

匯出的憑證檔（`.pfx`）路徑與憑證密碼，即為登入（`login`）時的第三、四個參數。

Linux 用戶請先於 Windows 或 Mac 完成申請與匯出，再將憑證檔複製至執行環境使用。

### 簽署

依照下方連結範例簽署

[線上簽署連結](https://mlapi.tssco.com.tw/web_api/service/fugle-api-sign)

> **注意：**
> 簽署完畢後，需間隔一天才會生效

#### 安裝套件

至 [SDK 下載頁面](https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/download/download-sdk) 下載相關套件

- Python
- Node.js

```
pip install taishin_sdk-<version>-cp37-abi3-win_amd64.whl
```

目前支援 3.8、3.9、3.10、3.11 與 3.12。

首先先建立一個 project 資料夾，並利用下列指令初始化

```
npm init
```

官網下載回來的檔案會像是 taishin-sdk-<version>.tgz，並且把它放入剛剛建立的資料夾中

把 node.js project 裡面的 package.json 增加一行

```
"dependencies": {
  ...
  "taishin-sdk": "file://<path-to-js-binary>/taishin-sdk-<version>.tgz",
  ...
}
```

然後到命令行輸入以下指令

```
npm install
```

目前支援 Node.js 16 以上版本。

#### 執行認證，開啟程式交易之旅

- Python
- Node.js

```
from taishin_sdk import TaishinSDK, Order, TimeInForce, OrderType, PriceType, MarketType, BSAction
# 載入設定檔與登入
sdk = TaishinSDK()
accounts = sdk.login("您的身分證字號", "您的登入密碼", "您的憑證位置", "您的憑證密碼")

acc  = accounts[0]

sdk.register_api_auth(acc) # 未開通過台新 API 之用戶，第一次登入時，需加入此行程式認證，認證完畢後，即可移除此行
```

可先單獨執行以上程式，

完成認證後，即可使用 SDK 各項功能

```
#建立委託物件
order = Order(
    buy_sell = BSAction.Buy,
    symbol = "2887",
    quantity   = 2000,
    price = "15",
    market_type = MarketType.Common,
    price_type  = PriceType.Limit,
    time_in_force = TimeInForce.ROD,
    order_type = OrderType.Stock,
)
order_res = sdk.stock.place_order(acc, order)
print(order_res)
```

太棒了🎊，完成下單任務，即可看到系統回覆的結果

```
PlaceOrderResponse  { 
    order_date: "20241028",
    order_time: "095945300",
    work_date: "20241028",
    is_pre_order: false,
    order_no: "h0001"
}
```

```
const { TaishinSDK, BSAction, TimeInForce, OrderType, PriceType, MarketType } = require('taishin-sdk');
//
const sdk = new TaishinSDK();

const accounts = sdk.login("您的身分證字號", "您的登入密碼", "您的憑證位置", "您的憑證密碼")

const acc = accounts[0];

const register = sdk.registerApiAuth(acc) // 未開通過台新 API 之用戶，第一次登入時，需加入此行程式，認證完畢後，即可移除此行
```

可先單獨執行以上程式，

完成認證後，即可使用 SDK 各項功能

```
const order = {
  buySell: BSAction.Buy,
  symbol: "2887",
  price: "15",
  quantity: 2000,
  marketType: MarketType.Common,
  priceType: PriceType.Limit,
  timeInForce: TimeInForce.ROD,
  orderType: OrderType.Stock,
};
//
sdk.stock.placeOrder(acc,order);
```

太棒了🎊，完成下單任務，即可看到系統回覆的結果

```
{ 
    orderDate: "20241028",
    orderTime: "095945300",
    workDate: "20241028",
    isPreOrder: false,
    orderNo: "h0001"
}
```

---

<a id="sec02"></a>
## 02 錯誤處理

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/error

錯誤訊息範例

```
{ 
  "code": "5001",
  "message": "查無資料" 
}
```

### 錯誤代碼表

> **注意：**
> 以下為可能遇到之錯誤代碼提供參考

#### 權限檢核錯誤代碼

| 代碼 | 說明 |
| --- | --- |
| A00007 | 尚未完成 API 簽署與認證 |

#### 登入錯誤代碼

| 代碼 | 說明 | 意義 |
| --- | --- | --- |
| CO-001 | 系統啟動時，初始化失敗. | 發生非預期錯誤，請嘗試重新登入，或洽富果客服。 |
| CO-002 | 系統執行時發生內部錯誤. | 發生非預期錯誤，請嘗試重新登入，或洽富果客服。 |
| 01-000 | 查無帳號. | 帳號或密碼錯誤，請確認後重新輸入。 |
| 01-001 | 帳號無登入權限. | 帳號或密碼錯誤，請確認後重新輸入。 |
| 01-002 | 帳號權限錯誤, 請洽客服人員. | 帳號或密碼錯誤，請確認後重新輸入。 |
| 01-010 | 密碼錯誤1次. | 帳號或密碼錯誤，請確認後重新輸入。 |
| 01-011 | 密碼錯誤2次. | 帳號或密碼錯誤，請確認後重新輸入。 |
| 01-012 | 密碼錯誤3次, 帳號鎖定. | 密碼錯誤次數已達上限，請至密碼專區「解鎖」或「補發」後再重新登入。 |
| 01-020 | 帳號鎖定. | 密碼錯誤次數已達上限，請至密碼專區「解鎖」或「補發」後再重新登入。 |
| AO-101 | 建立帳號失敗. | 發生非預期錯誤，請嘗試重新登入，或洽富果客服。 |
| AO-102 | 帳號不存在. | 帳號或密碼錯誤，請確認後重新輸入。 |
| AO-108 | 使用者不存在. | 帳號或密碼錯誤，請確認後重新輸入。 |

#### 交易錯誤代碼

| 代碼 | 說明 |
| --- | --- |
| 000008 | 後台系統或交易所回應Timeout |
| 000013 | 後台錯誤 ( 包含錯誤原因 ) |
| 000017 | 非交易接單時段 |

#### 帳務錯誤代碼

| 代碼 | 說明 |
| --- | --- |
| 0001 | 資料庫錯誤 |
| 0006 | 查詢參數錯誤 |
| 0007 | 伺服器錯誤 |
| 1000 | 查無帳號 |
| 1001 | 帳號無登入權限 |
| 1003 | 多帳號查詢驗證失敗 |
| 5000 | 錯誤不在定義的代號中 |
| 5001 | 查無資料 |
| 5003 | 系統資料查詢錯誤 |
| 6035 | 格式資料查詢錯誤 |
| 6045 | 今日已結帳完成，「當日已實現損益」、「現股當沖損益」、「信用當沖損益」等資料請改至歷史已實現損益功能查詢 |
| 8002 | 非預期的例外錯誤 |
| 9906 | 當日結帳轉檔中，請您稍後查詢 |

---

<a id="sec03"></a>
## 03 Python · 登入

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/login

login

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| personal_id | String | 登入的ID |
| password | String | 登入的密碼 |
| cert_path | String | 憑證路徑 |
| cert_pass | String | 憑證密碼 |

### 帳號資訊 Account 欄位

Return type: Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| branch_name | String | 分公司名 |
| account | String | 分公司代號 + 帳號 |
| account_type | String | 帳號類型 回傳 stk 證券 |
| name | String | 姓名 |
| s_mark | String | 現股當沖狀態 : B 可先賣後買與先買後賣、 Y、A 可先買後賣、其餘回傳未符合資格 |

### 請求範例

```
from taishin_sdk import TaishinSDK, Order, BSAction, TimeInForce, OrderType, PriceType, MarketType

sdk = TaishinSDK()

accounts = sdk.login("您的身分證字號", "您的登入密碼", "您的憑證位置", "您的憑證密碼")

print(accounts) #若有多帳號，則回傳多個
```

### 回傳範例

```
[Account {
    branch_name :"桃園",
    account: "592v980000",
    account_type: "stk",
    s_mark: "N",
    name: "許"
}, Account {
    branch_name :"營業部",
    account: "5920981100",
    account_type: "stk",
    s_mark: "N",
    name: "許"
}, Account {
    branch_name :"松德",
    account: "592a980222",
    account_type: "stk",
    s_mark: "N",
    name: "許"
}]
```

---

<a id="sec04"></a>
## 04 Python · 交易 · PlaceOrder

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/trade/PlaceOrder

place_order

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| order_object | OrderObject | 委託內容 |

### 委託資訊 PlaceOrderResponse 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| order_date | String | 委託日期 |
| order_time | String | 委託時間 |
| work_date | String | 有效交易日期 |
| is_pre_order | Bool | 預約單註記 |
| order_no | String | 委託書號 |

### 請求範例

```
order = Order(
    BSAction.Buy,
    "2887",
    1000,
    MarketType.Common,
    PriceType.Limit,
    TimeInForce.ROD,
    OrderType.Stock,
    "15.0"
)

sdk.stock.place_order(account, order)
```

### 回傳範例

```
PlaceOrderResponse {
    order_date: "20241004",   # 委託日期 (String)
    order_time: "152549030",  # 委託時間 (String)
    work_date: "20241004",    # 有效交易日期 (String)
    is_pre_order: false,      # 委託單狀態 (Bool)
    order_no: "g0002"         # 委託書編號 (String)    
}
```

---

<a id="sec05"></a>
## 05 Python · 交易 · GetOrderResults

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/trade/GetOrderResults

get_order_results

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| query_type | QueryType | 盤別 : All 全部、Reservation 預約單 、RegularSession 盤中、Cancelable 可取消委託、Failed 失敗單 |

### OrderRecord 回傳

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| work_date | String | 有效交易日期 |
| order_date | String | 委託日期 |
| order_time | String | 委託時間 |
| sys_code | String | 來源別 |
| order_no | String | 委託書號 |
| symbol | String | 股票代號 |
| buy_sell | BSAction | 買賣方向 :Buy 買、Sell 賣 |
| market | String | 市場 :T 上市、O 上櫃、R 興櫃 |
| market_type | MarketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg、 興櫃、IntradayOdd 盤中零股 |
| price_type | PriceType | 價格類型 : Limit 限價、Market 市價、 、 |
| time_in_force | TimeInForce | 委託條件別 : ROD 、 IOC 、 FOK |
| order_type | OrderType | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券 、DayTradeShort 現股當沖賣 |
| order_price | Double | 委託價格 |
| org_qty | Int | 原始下單股數 |
| filled_qty | Int | 已成交股數 |
| cel_qty | Int | 已取消股數 |
| can_cancel | Boolean | 是否可取消 : true 可取消、false不可取消 |
| err_code | String | 錯誤代碼 |
| err_msg | String | 錯誤訊息 |
| seq_no | String | 流水號 |
| is_pre_order | Boolean | 是否預約單 : true 是預約單、false不是預約單 |
| pre_order_no | String | 預約單號碼 |
| avg_price | Double | 成交均價 |
| chg_time | String | 變動時間 |
| chg_date | String | 變動日期 |

### 請求範例

```
sdk.stock.get_order_results(accounts.data[0])

# 帶入查詢參數
# sdk.stock.get_order_results(accounts.data[0], QueryType.All)
```

### 回傳範例

```
OrderRecord {
     work_date: "20241007",        # 有效交易日期 (String)
     order_date: "20241007",       # 委託日期 (String)
     order_time: "153823610",      # 委託時間 (String)
     sys_code: "4U",               # 來源別 (String)
     order_no: "f0002",            # 委託書號 (String)
     symbol: "2889",               # 股票代號 (String)
     buy_sell: Buy,                # 買賣方向 (BSAction)
     market: "T",                  # 市場 (String)
     market_type: Common,          # 盤別 (MarketType)
     price_type: Limit,            # 價格類型 (Enum)
     time_in_force: ROD,           # 委託條件 (Enum)
     order_type: "Stock",          # 委託類型 (String)
     order_price: 15.0,            # 委託價格 (Double)
     org_qty: 300000,              # 原始下單股數 (Int)
     filled_qty: 300000,           # 已成交數量 (Int)
     cel_qty: 0,                   # 已取消數量 (Int)
     can_cancel: false,            # 是否可取消 (Boolean)
     err_code: "000000",           # 錯誤代碼 (String)
     err_msg: "",                  # 錯誤訊息 (String)
     seq_no: "10000043",           # 流水號 (String)
     is_pre_order: false,          # 是否預約單 (Boolean)
     pre_order_no: "",             # 預約單號碼 (String)
     avg_price: 15.0,              # 平均成交價格 (Double)
     chg_time: "153823610",        # 異動時間 (String)
     chg_date: "20241007",         # 異動日期 (String)
 }
```

---

<a id="sec06"></a>
## 06 Python · 交易 · ModifyPrice

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/trade/ModifyPrice

modify_price

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | [Account] | 帳號 |
| OrderRecord | OrderRecord | 預計修改的委託單 |
| price | string | 修改後的價格 |
| priceType | PriceType | 修改後的價格旗標 : Limit 限價、Market 市價、LimitUp 漲停價 、 LimitDown 跌停價、Reference 平盤價 |

> **注意：**
> 僅盤前可以修改 PriceType，盤中時段不支援改 PriceType

> **注意：**
> 當 price 欄位有填入值時，priceType 欄位 Limit ； 當 priceType 不為 Limit 時，price 為 `0`

### 修改資訊 ModifiedResponse 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| order_date | String | 委託日期 |
| order_time | String | 委託時間 |

### 請求範例

```
sdk.stock.modify_price(account, order_res, "14.5", PriceType.Limit)
```

### 回傳範例

```
ModifiedResponse {
    order_date: "20241106",  # 委託日期 (String)
    order_time: "153607690"  # 委託時間 (String)
}
```

---

<a id="sec07"></a>
## 07 Python · 交易 · ModifyQuantity

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/trade/ModifyQuantity

modify_volume

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| orderRecord | OrderRecord | 預計修改的委託單 |
| volume | int | 刪減股數 (設為 0 表刪單) |

### ModifiedResponse 回傳

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| order_date | String | 委託日期 |
| order_time | String | 委託時間 |

### 請求範例

```
sdk.stock.modify_volume(account, target_order, 1000)
```

### 回傳範例

```
ModifiedResponse {
    order_date: "20241106",  # 委託日期 (String)
    order_time: "153607690"  # 委託時間 (String)
}
```

---

<a id="sec08"></a>
## 08 Python · 交易 · GetFilled

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/trade/GetFilled

get_filled

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| symbol | string ( Optional ) | 股票代號 |

### 成交資訊 FilledData 欄位

Return type : Object

| 參數 | 類型 | 說明 |
| --- | --- | --- |
| order_no | String | 委託書號 |
| sys_code | String | 來源別 |
| symbol | String | 股票代號 |
| mkt_seq_no | String | 成交序號 |
| market_type | MarketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg、 興櫃、IntradayOdd 盤中零股 |
| market | String | 市場 :T 上市、O 上櫃、R 興櫃 |
| buy_sell | String | 買賣方向 : Buy 買、Sell 賣 |
| order_type | String | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券、ShortSale 借券、 |
| payment | Double | 應收付總金額 |
| filled_date | String | 成交日期 |
| filled_time | String | 成交時間 |
| filled_qty | Int | 成交股數 |
| filled_price | Double | 成交價格 |

### 請求範例

```
sdk.stock.filled(account)
```

### 回傳範例

```
FilledRecordOutput {
    order_no: "g0002",                # 委託書號 (String)
    sys_code: "4U",                   # 來源別 (String)
    symbol: "2889",                   # 股票代號 (String)
    mkt_seq_no: "00000009",           # 成交序號 (String)
    market_type: Common,              # 盤別 (MarketType)
    market: "T",                      # 市場 (String)
    buy_sell: "B",                    # 買賣方向 (String)
    order_type: "0",                  # 委託單類型 (String)
    payment: 15000.0,                 # 應收付總金額 (Double)
    filled_date: "20241004",          # 成交日期 (String)
    filled_time: "152549030",         # 成交時間 (String)
    filled_qty: 1000,                 # 成交股數 (Int)
    filled_price: 15.0,               # 成交價格 (Double)
}
```

---

<a id="sec09"></a>
## 09 Python · 交易 · GetFilledDetail

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/trade/GetFilledDetail

get_filled_detail

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| symbol | string ( Optional ) | 股票代號 |

### 成交資訊 FilledDetailOutput 欄位

Return type : Object

| 參數 | 類型 | 說明 |
| --- | --- | --- |
| order_no | String | 委託書號 |
| sys_code | String | 來源別 |
| symbol | String | 股票代號 |
| market_type | MarketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg、 興櫃、IntradayOdd 盤中零股 |
| market | String | 市場 :T 上市、O 上櫃、R 興櫃 |
| buy_sell | String | 買賣方向 : Buy 買、Sell 賣 |
| order_type | String | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券、ShortSale 借券、 |
| payment | Double | 應收付總金額 |
| filled_date | String | 成交日期 |
| filled_qty | Int | 成交股數 |
| filled_price | Double | 成交價格 |

### 請求範例

```
sdk.stock.filled(account)
```

### 回傳範例

```
FilledRecordOutput {
    order_no: "g0002",                # 委託書號 (String)
    sys_code: "4U",                   # 來源別 (String)
    symbol: "2889",                   # 股票代號 (String)
    market_type: Common,              # 盤別 (MarketType)
    market: "T",                      # 市場 (String)
    buy_sell: "Buy",                    # 買賣方向 (String)
    order_type: "0",                  # 委託單類型 (String)
    payment: 15000.0,                 # 應收付總金額 (Double)
    filled_date: "20241004",          # 成交日期 (String)
    filled_qty: 1000,                 # 成交股數 (Int)
    filled_price: 15.0,               # 成交價格 (Double)
}
```

---

<a id="sec10"></a>
## 10 Python · 交易 · OrderHistory

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/trade/OrderHistory

order_history

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| start_date | string | 查詢開始日 ( YYYYMMDD ) |
| end_date | string | 查詢終止日 ( YYYYMMDD ) |

### OrderRecord 回傳

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| work_date | String | 有效交易日期 |
| order_date | String | 委託日期 |
| order_time | String | 委託時間 |
| sys_code | String | 來源別 |
| order_no | String | 委託書號 |
| symbol | String | 股票代號 |
| buy_sell | BSAction | 買賣方向 :Buy 買、Sell 賣 |
| market | String | 市場 :T 上市、O 上櫃、R 興櫃 |
| market_type | MarketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg、 興櫃、IntradayOdd 盤中零股 |
| price_type | PriceType | 價格類型 : Limit 限價、Market 市價、 、 |
| time_in_force | TimeInForce | 委託條件別 : ROD 、 IOC 、 FOK |
| order_type | OrderType | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券 |
| order_price | Double | 委託價格 |
| org_qty | Int | 原始下單股數 |
| filled_qty | Int | 已成交股數 |
| cel_qty | Int | 已取消股數 |
| can_cancel | Boolean | 是否可取消 : true 可取消、false不可取消 |
| err_code | String | 錯誤代碼 |
| err_msg | String | 錯誤訊息 |
| seq_no | String (optional) | 流水號 |
| is_pre_order | Boolean (optional) | 是否預約單 : true 是預約單、false不是預約單 |
| pre_order_no | String (optional) | 預約單號碼 |
| avg_price | Double (optional) | 成交均價 |
| chg_time | String (optional) | 變動時間 |
| chg_date | String (optional) | 變動日期 |

### 請求範例

```
sdk.stock.order_history(account,"20230921","20230922")
```

### 回傳範例

```
[OrderRecord {
    work_date: "20241007",          # 有效交易日期 (String)
    order_date: "20241007",         # 委託日期 (String)
    order_time: "153718236",        # 委託時間 (String)
    sys_code: "4U",                 # 來源別 (String)
    order_no: "",                   # 委託書號 (String)
    symbol: "2889",                 # 股票代號 (String)
    buy_sell: Buy,                  # 買賣方向: `Buy` 買 (String)
    market: "T",                    # 市場代號（"T"：台股）(String)
    market_type: Common,            # 盤別 (String)
    price_type: Limit,              # 價格類型 (String)
    time_in_force: ROD,             # 委託條件 (String)
    order_type: "Stock",            # 委託類型 (String)
    order_price: 15.0,              # 委託價格 (Double)
    org_qty: 150000,                # 委託數量 (Int)
    filled_qty: 0,                  # 已成交數量 (Int)
    cel_qty: 0,                     # 已取消數量 (Int)
    can_cancel: false,              # 是否可取消 (Boolean)
    err_code: "889",                # 錯誤代號 (String)
    err_msg: "委託額度逾電交投資能力, 請洽營業員！", # 錯誤訊息 (String)
    seq_no: None,                   # 流水號 (String)
    is_pre_order: None,             # 是否為預訂單 (Boolean)
    pre_order_no: None,             # 預訂單號碼 (String)
    avg_price: None,                # 平均成交價格 (Double)
    chg_time: None,                 # 異動時間 (String)
    chg_date: None,                 # 異動日期 (String)
},
OrderRecord {
    work_date: "20241007",          # 有效交易日期 (String)
    order_date: "20241007",          # 委託日期 (String)
    order_time: "153617390",         # 委託時間 (String)
    sys_code: "4U",                  # 來源別 (String)
    order_no: "h0001",               # 委託書號 (String)
    symbol: "2889",                  # 股票代號 (String)
    buy_sell: Buy,                   # 買賣方向 (String)
    market: "T",                     # 市場代號 (String)
    market_type: Common,             # 盤別 (String)
    price_type: Limit,               # 價格類型 (String)
    time_in_force: ROD,              # 委託條件 (String)
    order_type: "Stock",             # 委託類型 (String)
    order_price: 15.0,               # 委託價格 (Double)
    org_qty: 15000,                  # 委託數量 (Int)
    filled_qty: 15000,               # 已成交數量 (Int)
    cel_qty: 0,                      # 已取消數量 (Int)
    can_cancel: false,               # 是否可取消 (Boolean)
    err_code: "000000",              # 錯誤代號 (String)
    err_msg: "",                     # 錯誤訊息 (String)
    seq_no: None,                    # 流水號 (String)
    is_pre_order: None,              # 是否為預訂單 (Boolean)
    pre_order_no: None,              # 預訂單號碼 (String)
    avg_price: None,                 # 平均成交價格 (Double)
    chg_time: None,                  # 異動時間 (String)
    chg_date: None,                  # 異動日期 (String)
}]
```

---

<a id="sec11"></a>
## 11 Python · 交易 · FilledHistory

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/trade/FilledHistory

filled_history

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| start_date | string | 查詢開始日 ( YYYYMMDD ) |
| end_date | string | 查詢終止日 ( YYYYMMDD ) |

### 成交資訊 FilledData 欄位

Return type : Object

| 參數 | 類型 | 說明 |
| --- | --- | --- |
| order_no | String | 委託書號 |
| sys_code | String | 來源別 |
| symbol | String | 股票代號 |
| mkt_seq_no | String | 成交序號 |
| market_type | MarketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg、 興櫃、IntradayOdd 盤中零股 |
| market | String | 市場 :T 上市、O 上櫃、R 興櫃 |
| buy_sell | String | 買賣方向 : Buy 買、Sell 賣 |
| order_type | String | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券、ShortSale 借券、 |
| payment | Double | 應收付總金額 |
| filled_date | String | 成交日期 |
| filled_time | String | 成交時間 |
| filled_qty | Int | 成交股數 |
| filled_price | Double | 成交價格 |

### 請求範例

```
sdk.stock.filled_history(account,"20241004","20241004")
```

### 回傳範例

```
FilledRecordOutput {
    order_no: "g0002",                # 委託書號 (String)
    sys_code: "4U",                   # 來源別 (String)
    symbol: "2889",                   # 股票代號 (String)
    mkt_seq_no: "00000009",           # 成交序號 (String)
    market_type: Common,              # 盤別 (MarketType)
    market: "T",                      # 市場 (String)
    buy_sell: "B",                    # 買賣方向 (String)
    order_type: "0",                  # 委託單類型 (String)
    payment: 15000.0,                 # 應收付總金額 (Double)
    filled_date: "20241004",          # 成交日期 (String)
    filled_time: "152549030",         # 成交時間 (String)
    filled_qty: 1000,                 # 成交股數 (Int)
    filled_price: 15.0,               # 成交價格 (Double)
}
```

---

<a id="sec12"></a>
## 12 Python · 交易 · FilledHistoryDetail

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/trade/FilledHistoryDetail

filled_history_detail

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| start_date | string | 查詢開始日 ( YYYYMMDD ) |
| end_date | string | 查詢終止日 ( YYYYMMDD ) |

### 成交資訊 FilledDetailOutput 欄位

Return type : Object

| 參數 | 類型 | 說明 |
| --- | --- | --- |
| order_no | String | 委託書號 |
| sys_code | String | 來源別 |
| symbol | String | 股票代號 |
| mkt_seq_no | String | 成交序號 |
| market_type | MarketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg、 興櫃、IntradayOdd 盤中零股 |
| market | String | 市場 :T 上市、O 上櫃、R 興櫃 |
| buy_sell | String | 買賣方向 : Buy 買、Sell 賣 |
| order_type | String | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券、ShortSale 借券、 |
| payment | Double | 應收付總金額 |
| filled_date | String | 成交日期 |
| filled_time | String | 成交時間 |
| filled_qty | Int | 成交股數 |
| filled_price | Double | 成交價格 |

### 請求範例

```
sdk.stock.filled_history(account,"20241004","20241004")
```

### 回傳範例

```
FilledDetailOutput {
    order_no: "g0002",                # 委託書號 (String)
    sys_code: "4U",                   # 來源別 (String)
    symbol: "2889",                   # 股票代號 (String)
    mkt_seq_no: "00000009",           # 成交序號 (String)
    market_type: Common,              # 盤別 (MarketType)
    market: "T",                      # 市場 (String)
    buy_sell: "B",                    # 買賣方向 (String)
    order_type: "0",                  # 委託單類型 (String)
    payment: 15000.0,                 # 應收付總金額 (Double)
    filled_date: "20241004",          # 成交日期 (String)
    filled_time: "152549030",         # 成交時間 (String)
    filled_qty: 1000,                 # 成交股數 (Int)
    filled_price: 15.0,               # 成交價格 (Double)
}
```

---

<a id="sec13"></a>
## 13 Python · 交易 · MarginQuota

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/trade/MarginQuota

margin_quota

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| symbol | String | 股票代碼 |
| query_type | String | 查詢類別:1 融資、2 融券 |

### MarginShortQuotaOutput 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| symbol | String | 股票代號 |
| kind | String | 類別 (1: 融資, 2: 融券) |
| tqty | String | 資券限額 : 數量 、停資、停券、不限資 |
| stop | String | 是否停止融資/融券交易 (Y: 是, N: 否) |
| cr_percentage | String | 融資成數 (如 :0600 表0.6) |
| db_percentage | String | 融券成數 (如 :0900 表0.9) |
| bl_mark | String | 融券核准記號 |
| cr_status | String | 融資狀態 (查詢融資時才有) (如: 資0900 代表資成數) |
| db_status | String | 融券狀態 (查詢融券時才有) (如: 券0900 代表券成數) |
| cr_flag | String | 信用交易資格: Y 無信用交易資格、N 有信用交易資格 |
| lu_msg | String | 平盤下是否可券賣 |
| dte_msg | String | 是否可當沖、禁98戶 |

### 請求範例

```
sdk.stock.margin_quota(account, "2330")
```

### 回傳範例

```
MarginShortQuotaOutput {
    symbol: "2330",                      # 股票代號 (String)
    kind: "1",                           # 類別  (String)
    tqty: "不限資",                       # 資券限額 (String)
    stop: "N",                           # 是否停止融資/融券交易 (String)
    cr_percentage: "0600",               # 融資成數 (String)
    db_percentage: "0900",               # 融券成數 (String)
    bl_mark: "1",                        # 融券核准記號 (String)
    cr_status: None,                     # 融資狀態 (String)
    db_status: "券0900",                 # 融券狀態 (String)
    cr_flag: "N",                        # 信用交易資格 (String)
    lu_msg: "平盤下可券",                 # 平盤下可券賣 (String)
    dte_msg: "可當沖",                    # 可當沖 (String)
}
```

---

<a id="sec14"></a>
## 14 Python · 交易 · ShortDayTradeQuota

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/trade/ShortDayTradeQuota

short_daytrade_quota

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| symbol | string | 股票代碼 |

### ShortResource 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| quota | String | 現沖券剩餘張數 |
| total | String | 現冲券原始額度 |
| used | String | 現冲券使用額度 |

### 請求範例

```
sdk.stock.short_daytrade_quota(account, "2330")
```

### 回傳範例

```
ShortResource {
    quota: "00000740",   # 現沖券剩餘張數 (String)
    total: "00000740",   # 現冲券原始額度 (String)
    used: "00000000",    # 現冲券使用額度 (String)
}
```

---

<a id="sec15"></a>
## 15 Python · 交易 · QueryAttentionStock

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/trade/QueryAttentionStock

query_attention_stock

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| symbol | String ( Optional ) | 股票代號 |

### AlertStockOutput 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| market_type | Int | 市場別 : 0 上市、1上櫃、3興櫃 |
| symbol | String | 股票代號 |
| lower_limit_price | Double | 跌停價 |
| closing_price | Double | 收盤價 |
| upper_limit_price | Double | 漲停價 |
| alert_start_date | String | 警示開始日期 |
| alert_end_date | String | 警示結束日期 |
| alert_handling_mode | Int | 警示處理模式 : 1 受處置、2再處置 、 非1、2 為正常 |
| stock_name | String | 股票名稱 |
| message_description | String | 訊息說明（風控股票提示） |
| short_selling_at_flat_mark | String | 平盤下可否券賣（1 表示可平盤下券賣、不為 1 則不可平盤下券賣） |
| short_selling_at_flat_allowed | String | 平盤下可券賣狀態 ( 當股查詢時才有值 ) |
| day_trading_and_account98_status | String | 是否可當沖及禁98戶 |

### 請求範例

```
# 查詢全部
sdk.stock.query_attention_stock(account)

# 查詢單檔
sdk.stock.query_attention_stock(account,"9945")
```

### 回傳範例

```
AlertStockOutput { 
     market_type: 0,                                                         # 市場別 (Int)
     symbol: "9945",                                                         # 股票代號 (String)
     lower_limit_price: 43.65,                                               # 當日跌停價 (Double)
     closing_price: 48.45,                                                   # 當日收盤價 (Double)
     upper_limit_price: 53.20,                                               # 當日漲停價 (Double)
     alert_start_date: "20241008",                                           # 警示開始日期 (String)
     alert_end_date: "20241011",                                             # 警示結束日期 (String)
     alert_handling_mode: 0,                                                 # 警示處理模式 (Int)
     stock_name: "潤泰新",                                                    # 股票名稱 (String)
     message_description: "風控股票，請務必查詢是否委託成功，或洽營業員辦理！",   # 訊息說明 (String)
     short_selling_at_par_mark: "1",                                          # 平盤下可否券賣 (String)
     short_selling_at_par_allowed: "平盤下可券",                               # 平盤下可券賣狀態 (String)
     day_trading_and_account98_status: "禁當沖",                               # 當沖及帳戶98狀態 (String)
 }
```

---

<a id="sec16"></a>
## 16 Python · 交易 · QueryDispositionStock

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/trade/QueryDispositionStock

query_disposition_stock

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| symbol | string | 股票代號 |

### StockStatusOutput 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| symbol | string | 股票代號 |
| abnormal_recommendation_mark | string | 異常推介註記 : 0 表示正常、1投資理財節目異常推介 |
| abnormal_description | string | 異常說明 |
| special_abnormal_mark | string | 特殊異常註記 : 0 表示正常、1特殊異常有價證券 |
| special_abnormal_description | string | 特殊異常說明 |
| disposition_stock_mark | string | 處置股票註記 : 0 表示正常、1 處置股票、2 再次處置、3彈性處置 |
| disposition_description | string | 處置說明 |
| internal_control_category | string | 內控類別 : 0 表示正常、AA委託超過 30 萬需預收、A 委託超過 50 萬需預收、B 委託超過 300 萬需預收、C 委託超過 500 萬需預收 |
| internal_control_description | string | 內控類別說明 |

### 請求範例

```
sdk.stock.query_disposition_stock(account,"4956")
```

### 回傳範例

```
StockStatusOutput {
     symbol: "4956",                         # 股票代號 (String)
     abnormal_recommendation_mark: "0",      # 異常推介註記 (String) : `0` 表示正常、`1`投資理財節目異常推介
     abnormal_description: "",               # 異常說明 (String)
     special_abnormal_mark: "0",             # 特殊異常註記 (String) : `0` 表示正常、`1`特殊異常有價證券
     special_abnormal_description: "",       # 特殊異常說明 (String)
     disposition_stock_mark: "1",            # 處置股票註記 (String) : `0` 表示正常、`1` 處置股票、`2` 再次處置、`3`彈性處置
     disposition_description: "處置有價證券，請注意交易風險！", # 處置股票說明 (String)
     internal_control_category: "0",         # 內控類別 (String) : `0` 表示正常、`AA`委託超過 30 萬需預收、`A` 委託超過 50 萬需預收、`B` 委託超過 300 萬需預收、`C` 委託超過 500 萬需預收
     internal_control_description: "",       # 內控類別說明 (String)
 }
```

---

<a id="sec17"></a>
## 17 Python · 帳務 · AccountTotalPnL

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/accountManagement/AccountTotalPnL

account_total_pnl

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |

### 帳戶損益速查 AccountQuickInquiryResponse 欄位

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| unrealized_profit_loss_cash | String | 未實現損益（現股） |
| unrealized_profit_loss_margin | String | 未實現損益（融資） |
| unrealized_profit_loss_short_selling | String | 未實現損益（融券） |
| unrealized_profit_loss_total | String | 未實現損益總計 |
| realized_profit_loss_cash | String | 已實現損益（現股） |
| realized_profit_loss_margin | String | 已實現損益（融資） |
| realized_profit_loss_short_selling | String | 已實現損益（融券） |
| realized_profit_loss_total | String | 已實現損益總計 |
| day_trading_profit_loss_credit | String | 當沖損益（信用） |
| day_trading_profit_loss_cash | String | 當沖損益（現股） |
| net_amount | String | 淨收付金額 |
| account_maintenance_rate | string | 整戶維持率 |
| total_profit_loss_cash | String | 總損益（現股） |
| total_profit_loss_margin | String | 總損益（融資） |
| total_profit_loss_short_selling | String | 總損益（融券） |
| total_profit_loss | String | 總損益 |

### 請求範例

```
sdk.accounting.account_total_pnl(account)
```

### 回傳範例

```
AccountQuickInquiryResponse = {
    unrealized_profit_loss_cash: "82593",         # 未實現損益（現股） (string)
    unrealized_profit_loss_margin: "0",          # 未實現損益（融資） (string)
    unrealized_profit_loss_short_selling: "0",   # 未實現損益（融券） (string)
    unrealized_profit_loss_total: "82593",       # 未實現損益總計 (string)
    realized_profit_loss_cash: "0",              # 已實現損益（現股） (string)
    realized_profit_loss_margin: "0",            # 已實現損益（融資） (string)
    realized_profit_loss_short_selling: "0",     # 已實現損益（融券） (string)
    realized_profit_loss_total: "0",             # 已實現損益總計 (string)
    day_trading_profit_loss_credit: "0",         # 當沖損益（信用） (string)
    day_trading_profit_loss_cash: "0",           # 當沖損益（現股） (string)
    net_amount: "-2904132",                      # 淨收付金額 (string)
    account_maintenance_rate: None,              # 整戶維持率 (string)
    total_profit_loss_cash: "82593",             # 總損益（現股） (string)
    total_profit_loss_margin: "0",               # 總損益（融資） (string)
    total_profit_loss_short_selling: "0",        # 總損益（融券） (string)
    total_profit_loss: "82593",                  # 總損益 (string)
}
```

---

<a id="sec18"></a>
## 18 Python · 帳務 · Inventories

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/accountManagement/Inventories

inventories

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |

### PositionResponse 欄位

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| no | string | 序號 |
| prev_day_quantity | string | 昨日庫存股數 |
| current_quantity | string | 即時庫存股數 |
| today_quantity | string | 今日增減成交股數 |
| today_buy_quantity | string | 今日買進成交數量 |
| today_sell_quantity | string | 今日賣出成交數量 |
| cost | string | 付出成本 |
| market_value | string | 現值 |
| unrealized_profit_loss | string | 未實現損益 |
| unrealized_profit_loss_rate | string | 未實現損益率 |
| securities_transaction_income_tax | string | 證券交易所得稅 |
| health_insurance_fee | string | 健保補充費 |
| fee | string | 手續費 |
| tax | string | 交易稅 |
| open_margin_amount | string | 未償還融資/券金額 |
| open_guarantee_amount | string | 未償還融券保證金 |
| open_short_collateral | string | 未償還擔保品 |
| short_selling_fee | string | 融券手續費 |
| own_funds_amount | string | 自備款 |
| other_cost | string | 其他費用 ( 除手續費、交易稅外的費用項目 (資/券利息也包含在內) ) |
| interest | string | 利息 |
| unrealized_net_amount | string | 預估淨收付 |
| total_profit_loss | string | 總損益 |
| realized_profit_loss | string | 當日已實現損益 |
| dividend_amount | string | 除息金額 |
| account_summary | object | 帳戶摘要 |
| └─ margin_position_market_value_sum | string | 融資市值加總 |
| └─ short_position_market_value_sum | string | 融券市值加總 |
| └─ short_collateral_sum | string | 融券擔保品加總 |
| └─ margin_limit | string | 融資限額 |
| └─ short_limit | string | 融券限額 |
| └─ guarantee_amount_sum | string | 擔保金總和 |
| └─ margin_amount_sum | string | 融資金額總和 |
| └─ short_amount_sum | string | 融券金額總和 |
| └─ account_maintenance_rate | string | 帳戶維持率 |
| └─ settlement_today | string | 今日交割 |
| └─ settlement_yesterday | string | 昨日交割 |
| └─ settlement_net | string | 淨交割金額 |
| position_summaries | array | 持倉摘要清單 |
| └─ branch_id | string | 分公司代號 |
| └─ cust_id | string | 帳號 |
| └─ no | string | 序號 |
| └─ symbol | string | 股票代碼 |
| └─ name | string | 用戶名 |
| └─ symbol_name | string | 股票名稱 |
| └─ stock_evaluation | string | 股票評價 |
| └─ order_type | string | 交易類型 : 0 整股、1 , 3 融資、2 , 4 融券、9 現賣 ( 擔保品 ) |
| └─ order_type_name | string | 交易類型名稱 |
| └─ buy_sell | string | 買賣別 : B、S |
| └─ prev_day_quantity | string | 昨日庫存股數 |
| └─ current_quantity | string | 即時庫存股數 |
| └─ total_quantity | string | 今日交易增減成交股數 |
| └─ total_buy_quantity | string | 今日買進成交股數 |
| └─ total_sell_quantity | string | 今日賣出成交股數 |
| └─ cost | string | 成本 |
| └─ cost_before_dividend | string | 成本 (不扣除息金額) |
| └─ average_price | string | 成交均價 |
| └─ open_margin_amount | string | 未償還融資金額 |
| └─ guarantee_amount | string | 保證金 |
| └─ open_guarantee_amount | string | 未償還融券保證金 |
| └─ short_collateral | string | 擔保品 |
| └─ open_short_collateral | string | 未償還擔保品 |
| └─ short_selling_fee | string | 融券手續費 |
| └─ own_funds_amount | string | 自備款 |
| └─ guarantee_default_amount | string | 擔保金缺額 |
| └─ current_price | string | 現價 |
| └─ market_value | string | 市值 |
| └─ unrealized_profit_loss | string | 未實現損益 |
| └─ unrealized_profit_loss_rate | string | 未實現損益率 |
| └─ fee | string | 手續費 |
| └─ tax | string | 稅金 |
| └─ interest | string | 利息 |
| └─ other_cost | string | 其他費用 ( 除手續費、交易稅外的費用項目 (資/券利息也包含在內) ) |
| └─ unrealized_net_amount | string | 預估淨收付金額 |
| └─ target_price | string | 標的股票現價 |
| └─ portfolio_type | string | 權證種類 :1 認購權證、2認售權證、3牛證、4熊證、 空白 整股 |
| └─ holding_percent | string | 持有比率 |
| └─ securities_income_tax | string | 證券所得稅 |
| └─ health_insurance_fee | string | 健保補充費 |
| └─ reference_price | string | 參考價格 |
| └─ total_profit | string | 總損益 |
| └─ realized_profit | string | 當日已實現損益 |
| └─ pledge_quantity | string | 質押數量 |
| └─ amount | string | 會總成交價金 |
| └─ average_filled_price | string | 平均成交價格 |
| └─ break_even_price | string | 損益兩平價格 |
| └─ dividend_amount | string | 股利金額 |
| └─ position_details | array | 持倉明細 |
| └─ no | string | 序號 |
| └─ t_date | string | 成交日期 |
| └─ order_type | string | 交易類型 : 0 整股、1 , 3 融資、2 , 4 融券、9 現賣 ( 擔保品 ) |
| └─ order_type_name | string | 訂單類型名稱 |
| └─ buy_sell | string | 買賣別 : B、S |
| └─ delegate_sequence | string | 委託書號 |
| └─ filled_no | string | 成交序號 |
| └─ filled_quantity | string | 成交數量 |
| └─ prev_day_quantity | string | 昨日庫存股數 |
| └─ filled_price | string | 成交價格 |
| └─ filled_amount | string | 成交金額 |
| └─ current_price | string | 現價 |
|   └─ market_value | string | 市值 |
| └─ margin_amount | string | 融資金額 |
| └─ open_margin_amount | string | 未償還融資/券金額 |
| └─ short_collateral | string | 融券抵押品 |
| └─ open_short_collateral | string | 未償還擔保品 |
| └─ guarantee_amount | string | 保證金 |
| └─ open_guarantee_amount | string | 未償還融券保證金 |
| └─ securities_lending_fee | string | 標借費 |
| └─ short_selling_fee | string | 融券費手續費 |
| └─ fee | string | 手續費 |
| └─ tax | string | 交易稅 |
| └─ interest | string | 利息 |
| └─ cost | string | 收付金額 |
| └─ cost_before_dividend | string | 收付金額(不扣除息金額) |
| └─ change_type | string | 異動別 |
| └─ own_funds_amount | string | 自備款 |
| └─ portfolio_type | string | 權證種類 |
| └─ cust_id | string | 帳號 |
| └─ name | string | 名稱 |
| └─ branch_id | string | 分行 ID |
| └─ other_cost | string | 其他費用 ( 除手續費、交易稅外的費用項目 (資/券利息也包含在內) ) |
| └─ is_adjustable | string | 是否可調整成本:Y開放、N不開放 |
| └─ securities_income_tax | string | 證券所得稅 |
| └─ health_insurance_fee | string | 健康保險費 |
| └─ unrealized_profit_loss | string | 未實現損益 |
| └─ reference_price | string | 參考價格 |
| └─ io_flag | string | 異動代碼 |
| └─ io_name | string | 異動名稱 |
| └─ break_even_price | string | 損益兩平價格 |
| └─ dividend_amount | string | 股利金額 |
| └─ guarantee_default_amount | string | 擔保金缺額 |

### 請求範例

```
sdk.accounting.inventories(accounts)
```

### 回傳範例

```
PositionResponse {
    no: "合計",                                  # 序號 (string)
    prev_day_quantity: "26796",                  # 昨日庫存股數 (string)
    current_quantity: "26796",                   # 即時庫存股數 (string)
    today_quantity: "0",                         # 今日增減成交股數 (string)
    today_buy_quantity: "0",                     # 今日買進成交數量 (string)
    today_sell_quantity: "0",                    # 今日賣出成交數量 (string)
    cost: "348817",                              # 付出成本 (string)
    market_value: "549957",                      # 現值 (string)
    unrealized_profit_loss: "198916",            # 未實現損益 (string)
    unrealized_profit_loss_rate: "57.03%",       # 未實現損益率 (string)
    securities_transaction_income_tax: "0",      # 證券交易所得稅 (string)
    health_insurance_fee: "0",                   # 健保補充費 (string)
    fee: "489",                                  # 手續費 (string)
    tax: "0",                                    # 交易稅 (string)
    open_margin_amount: "0",                     # 未償還融資/券金額 (string)
    open_guarantee_amount: "0",                  # 未償還融券保證金 (string)
    open_short_collateral: "0",                  # 未償還擔保品 (string)
    short_selling_fee: "0",                      # 融券手續費 (string)
    own_funds_amount: "0",                       # 自備款 (string)
    other_cost: "0",                             # 其他費用 (string)
    interest: "0",                               # 利息 (string)
    unrealized_net_amount: "547733",             # 預估淨收付 (string)
    total_profit_loss: "198916.00",              # 總損益 (string)
    realized_profit_loss: "0",                   # 當日已實現損益 (string)
    dividend_amount: "360.00",                   # 除息金額 (string)
    account_summary: AccountSummary {
        margin_position_market_value_sum: "0",   # 融資市值加總 (string)
        short_position_market_value_sum: "0",    # 融券市值加總 (string)
        short_collateral_sum: "0",               # 融券擔保品加總 (string)
        margin_limit: "0",                       # 融資限額 (string)
        short_limit: "0",                        # 融券限額 (string)
        guarantee_amount_sum: "0",               # 擔保金總和 (string)
        margin_amount_sum: "0",                  # 融資金額總和 (string)
        short_amount_sum: "0",                   # 融券金額總和 (string)
        account_maintenance_rate: "0%",          # 帳戶維持率 (string)
        settlement_today: "0",                   # 今日交割 (string)
        settlement_yesterday: "0",               # 昨日交割 (string)
        settlement_net: "0",                     # 淨交割金額 (string)
    },
    position_summaries: [
        PositionSummary {
            branch_id: "5920",                   # 分公司代號 (string)
            cust_id: "1234567",                  # 帳號 (string)
            no: "1",                             # 序號 (string)
            symbol: "00885",                     # 股票代碼 (string)
            name: "許ＯＯ",                       # 用戶名 (string)
            symbol_name: "富邦越南",               # 股票名稱 (string)
            stock_evaluation: "",                # 股票評價 (string)
            order_type: "0",                     # 交易類型 (string)
            order_type_name: "現買",              # 交易類型名稱 (string)
            buy_sell: "B",                       # 買賣別 (string)
            prev_day_quantity: "1000",           # 昨日庫存股數 (string)
            current_quantity: "1000",            # 即時庫存股數 (string)
            total_quantity: "0",                 # 今日交易增減成交股數 (string)
            total_buy_quantity: "0",             # 今日買進成交股數 (string)
            total_sell_quantity: "0",            # 今日賣出成交股數 (string)
            cost: "16173",                       # 成本 (string)
            cost_before_dividend: "16173.00",    # 成本 (不扣除息金額) (string)
            average_price: "16.17",              # 成交均價 (string)
            open_margin_amount: "0",             # 未償還融資金額 (string)
            guarantee_amount: "0",               # 保證金 (string)
            open_guarantee_amount: "0",          # 未償還融券保證金 (string)
            short_collateral: "0",               # 擔保品 (string)
            open_short_collateral: "0",          # 未償還擔保品 (string)
            short_selling_fee: "0",              # 融券手續費 (string)
            own_funds_amount: "0",               # 自備款 (string)
            guarantee_default_amount: "0",       # 擔保金缺額 (string)
            current_price: "11.7",               # 現價 (string)
            market_value: "11700",               # 市值 (string)
            unrealized_profit: None,             # 未實現損益 (None)
            unrealized_profit_loss_rate: "-27.85%", # 未實現損益率 (string)
            fee: "23",                           # 手續費 (string)
            tax: "0",                            # 稅金 (string)
            interest: "0",                       # 利息 (string)
            other_cost: "0",                     # 其他成本 (string)
            unrealized_net_amount: "11669",      # 預估淨收付金額 (string)
            target_price: "0",                   # 標的股票現價 (string)
            portfolio_type: "",                  # 權證種類 (string)
            holding_percent: "2.13%",            # 持有比率 (string)
            securities_income_tax: "0",          # 證券所得稅 (string)
            health_insurance_fee: "0",           # 健保補充費 (string)
            reference_price: "0",                # 參考價格 (string)
            total_profit: "-4504.00",            # 總損益 (string)
            realized_profit: "0",                # 當日已實現損益 (string)
            pledge_quantity: "1000",             # 質押數量 (string)
            amount: "16150.00",                  # 會總成交價金 (string)
            average_filled_price: "16.15",       # 平均成交價格 (string)
            break_even_price: "16.22",           # 損益兩平價格 (string)
            dividend_amount: "0",                # 股利金額 (string)
            position_details: [
                PositionDetail {
                    no: "1",                    # 序號 (string)
                    t_date: "20210419",         # 成交日期 (string)
                    order_type: "0",            # 交易類型 (string)
                    order_type_name: "現買",     # 訂單類型名稱 (string)
                    buy_sell: "B",              # 買賣別 (string)
                    delegate_sequence: "i0317",  # 委託書號 (string)
                    filled_no: "0000001",       # 成交序號 (string)
                    filled_quantity: "1000",    # 成交數量 (string)
                    prev_day_quantity: "1000",  # 昨日庫存股數 (string)
                    filled_price: "16.15",      # 成交價格 (string)
                    filled_amount: "16150.00",  # 成交金額 (string)
                    current_price: "11.7",      # 現價 (string)
                    market_value: "11700",      # 市值 (string)
                    margin_amount: "0",         # 融資金額 (string)
                    open_margin_amount: "0",    # 未償還融資/券金額 (string)
                    short_collateral: "0",      # 融券抵押品 (string)
                    open_short_collateral: "0", # 未償還擔保品 (string)
                    guarantee_amount: "0",      # 保證金 (string)
                    open_guarantee_amount: "0", # 未償還融券保證金 (string)
                    securities_lending_fee: "0",# 標借費 (string)
                    short_selling_fee: "0",     # 融券費手續費 (string)
                    fee: "23",                  # 手續費 (string)
                    tax: "0",                   # 交易稅 (string)
                    interest: "0",              # 利息 (string)
                    cost: "16173",              # 收付金額 (string)
                    cost_before_dividend: "16173", # 收付金額(不扣除息金額) (string)
                    change_type: "0",           # 異動別 (string)
                    own_funds_amount: "0",      # 自備款 (string)
                    portfolio_type: "",         # 權證種類 (string)
                    cust_sequence: "1234567",   # 帳號序號 (string)
                    name: "許ＯＯ",              # 名稱 (string)
                    branch_id: "5920",          # 分行 ID (string)
                    other_cost: "0",            # 其他成本 (string)
                    is_adjusted: None,          # 是否可調整 (None)
                    securities_income_tax: "0", # 證券所得稅 (string)
                    health_insurance_fee: "0",  # 健康保險費 (string)
                    unrealized_profit_loss: "-4504", # 未實現損益 (string)
                    unrealized_profit_loss_rate: None, # 未實現損益率 (None)
                    reference_price: "0",       # 參考價格 (string)
                    io_flag: "",                # 異動代碼 (string)
                    io_name: "",                # 異動名稱 (string)
                    break_even_price: "16.22",  # 損益兩平價格 (string)
                    dividend_amount: "0",       # 股利金額 (string)
                    guarantee_default_amount: "0" # 擔保金缺額 (string)
                },
            ],
        },
        ...
    ]
}
```

---

<a id="sec19"></a>
## 19 Python · 帳務 · TodayTradeSummary

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/accountManagement/TodayTradeSummary

today_trade_summary

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| symbol | String ( Optional ) | 股票代號 |

### RealtimePositionQuantityOutput 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| symbol | String | 股票代號 |
| market_type | String | 市場別 : T 上市 、 O 上櫃、 R 興櫃 |
| common_stock_quantity | String | 昨日餘額普通股股數 |
| margin_stock_quantity | String | 昨日餘額融資股數 |
| short_stock_quantity | String | 昨日餘額融券股數 |
| odd_lot_quantity | String | 昨日餘額零股股數 |
| real_time_depository_quantity | String | 今日餘額普通股股數 |
| real_time_margin_quantity | String | 今日餘額融資股數 |
| real_time_short_selling_quantity | String | 今日餘額融券股數 |
| real_time_odd_lot_quantity | String | 今日餘額零股股數 |
| today_depository_buy_order_quantity | String | 今日普通股委託買進股數 |
| today_margin_buy_order_quantity | String | 今日融資委託買進股數 |
| today_short_selling_buy_order_quantity | String | 今日融券委託買進股數 |
| today_odd_lot_buy_order_quantity | String | 今日零股委託買進股數 |
| today_depository_sell_order_quantity | String | 今日普通股委託賣出股數 |
| today_margin_sell_order_quantity | String | 今日融資委託賣出股數 |
| today_short_selling_sell_order_quantity | String | 今日融券委託賣出股數 |
| today_odd_lot_sell_order_quantity | String | 今日零股委託賣出股數 |
| today_depository_buy_executed_quantity | String | 今日普通股買進成交股數 |
| today_margin_buy_executed_quantity | String | 今日融資買進成交股數 |
| today_short_selling_buy_executed_quantity | String | 今日融券買進成交股數 |
| today_odd_lot_buy_executed_quantity | String | 今日零股買進成交股數 |
| today_depository_sell_executed_quantity | String | 今日普通股賣出成交股數 |
| today_margin_sell_executed_quantity | String | 今日融資賣出成交股數 |
| today_short_selling_sell_executed_quantity | String | 今日融券賣出成交股數 |
| today_odd_lot_sell_executed_quantity | String | 今日零股賣出成交股數 |

### 請求範例

```
sdk.accounting.today_trade_summary(account)
```

### 回傳範例

```
RealtimePositionQuantityOutput {
    symbol: "1108",                               # 商品代碼 (String)
    market_type: "T",                             # 市場別 (String) : T 上市 、 O 上櫃、 R 興櫃 
    common_stock_quantity: "0",                   # 昨日餘額普通股股數 (String)
    margin_stock_quantity: "0",                   # 昨日餘額融資股數 (String)
    short_selling_quantity: "0",                  # 昨日餘額融券股數 (String)
    odd_lot_quantity: "0",                        # 昨日餘額零股股數 (String)
    real_time_depository_quantity: "1000",         # 即時普通股股數 (String)
    real_time_margin_quantity: "0",                # 即時融資股數 (String)
    real_time_short_selling_quantity: "0",         # 即時融券股數 (String)
    real_time_odd_lot_quantity:  "0",              # 即時零股股數 (String)
    today_depository_buy_order_quantity: "1000",   # 今日普通股委託買進股數 (String)
    today_margin_buy_order_quantity: "0",          # 今日融資委託買進股數 (String)
    today_short_selling_buy_order_quantity:  "0",  # 今日融券委託買進股數 (String)
    today_odd_lot_buy_order_quantity:  "0",        # 今日零股委託買進股數 (String)
    today_depository_sell_order_quantity:  "0",    # 今日普通股委託賣出股數 (String)
    today_margin_sell_order_quantity:  "0",        # 今日融資委託賣出股數 (String)
    today_short_selling_sell_order_quantity:  "0", # 今日融券委託賣出股數 (String)
    today_odd_lot_sell_order_quantity:  "0",       # 今日零股委託賣出股數 (String)
    today_depository_buy_executed_quantity:  "1000",   # 今日普通股買進成交股數 (String)
    today_margin_buy_executed_quantity:  "0",          # 今日融資買進成交股數 (String)
    today_short_selling_buy_executed_quantity:  "0",   # 今日融券買進成交股數 (String)
    today_odd_lot_buy_executed_quantity:  "0",         # 今日零股買進成交股數 (String)
    today_depository_sell_executed_quantity: "0",      # 今日普通股賣出成交股數 (String)
    today_margin_sell_executed_quantity: "0",          # 今日融資賣出成交股數 (String)
    today_short_selling_sell_executed_quantity:  "0",  # 今日融券賣出成交股數 (String)
    today_odd_lot_sell_executed_quantity:  "0",        # 今日零股賣出成交股數 (String)
}
```

---

<a id="sec20"></a>
## 20 Python · 帳務 · RealizedPnLDetail

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/accountManagement/RealizedPnLDetail

realized_profit_and_loses

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| start_date | string | 查詢起始日 ( YYYYMMDD ) |
| end_date | string | 查詢終止日 ( YYYYMMDD ) |
| symbol | string | 股票代號 |

### 已實現 Realized 欄位

Return type : Object

| Parameter | Type | Description |
| --- | --- | --- |
| no | String | 編號 |
| cost | String | 買入成本 |
| income | String | 賣出成本 |
| profit_loss | String | 損益 |
| profit_loss_rate | String | 損益率 |
| accumulated_cost | String | 累計成本 |
| accumulated_profit_loss | String | 累計損益 |
| accumulated_profit_loss_rate | String | 累計損益率 |
| short_selling_fee | String | 融券手續費 |
| interest | String | 利息 |
| closed_margin_amount | String | 償還融資金額 |
| dividend_amount | String | 股利金額 |
| securities_lending_differential_fee | String | 券差借券費 |
| profit_loss_summary | List | 損益摘要 |
| └─ no | String | 編號 |
| └─ t_date | String | 交易日期 |
| └─ branch_id | String | 分公司代號 |
| └─ cust_id | String | 帳號 |
| └─ name | String | 客戶姓名 |
| └─ order_type | String | 委託別 (0 整股, 1,3 融資, 2,4 融券, 9 現賣) |
| └─ order_type_name | String | 委託類型名稱 |
| └─ buy_sell | String | 買賣別 (B, S) |
| └─ symbol | String | 股票代號 |
| └─ symbol_name | String | 股票名稱 |
| └─ target_price | String | 標的現價 |
| └─ portfolio_type | String | 權證種類 - |
| └─ order_no | String | 委託序號 |
| └─ filled_no | String | 成交序號 |
| └─ closed_quantity | String | 沖銷股數 |
| └─ filled_price | String | 成交價格 |
| └─ closed_margin_amount | String | 償還融資金額 |
| └─ closed_short_collateral | String | 償還擔保品 |
| └─ closed_guarantee_amount | String | 償還融券保證金 |
| └─ interest | String | 利息 |
| └─ short_selling_fee | String | 借券費 |
| └─ cost | String | 成本 |
| └─ cost_before_dividend | String | 成本 (不扣除息金額) |
| └─ income | String | 賣出收入 |
| └─ profit_loss | String | 損益 |
| └─ profit_loss_rate | String | 損益率 |
| └─ other_cost | String | 其他費用 ( 除手續費、交易稅外的費用項目 (資/券利息也包含在內) ) |
| └─ close_type | String | 沖銷類別 (0 現股, 1 融資, 2 融券, 3 信用當沖, 4 現股當沖, 5 現賣) |
| └─ order_type_name_2 | String | 委託類別名稱 |
| └─ dividend_amount | String | 除息金額 |
| └─ securities_lending_differential_fee | String | 券差借券費 |
| buy_detail | object | 買入詳情 |
| └─ filled_quantity | String | 成交數量 |
| └─ filled_amount | String | 成交金額 |
| └─ net_amount | String | 淨收付 |
| └─ margin_amount | String | 融資金額 |
| └─ guarantee_amount | String | 保證金金額 |
| └─ short_collateral | String | 融券擔保品 |
| └─ securities_lending_fee | String | 標借費 |
| └─ adjustment_date | String | 調整日期 |
| └─ order_type | String | 委託別 : 0 整股、1、3融資、2、4融券、 9現賣（擔保品） |
| └─ order_type_name | String | 委託類型名稱 |
| └─ buy_sell | String | 買賣方向 |
| └─ change_type | String | 變更類型 |
| └─ is_adjusted | String | 是否開放調整成本 |
| └─ io_flag | String | 異動代碼 |
| └─ io_name | String | 異動名稱 |
| └─ no | String | 編號 |
| └─ t_date | String | 交易日期 |
| └─ order_no | String | 委託序號 |
| └─ filled_no | String | 成交序號 |
| └─ closed_quantity | String | 沖銷股數 |
| └─ filled_price | String | 成交價格 |
| └─ closed_margin_amount | String | 償還融資金額 |
| └─ closed_shortCollateral | String | 償還擔保品 |
| └─ closed_guarantee_amount | String | 償還融券保證金 |
| └─ fee | String | 手續費 |
| └─ interest | String | 利息 |
| └─ tax | String | 稅金 |
| └─ short_selling_fee | String | 借券費 |
| └─ cost | String | 成本 |
| └─ cost_before_dividend | String | 成本 (不扣除息金額) |
| └─ income | String | 賣出收入 |
| └─ profit_loss | String | 損益 |
| └─ profit_loss_rate | String | 損益率 |
| └─ other_cost | String | 其他費用 ( 除手續費、交易稅外的費用項目 (資/券利息也包含在內) ) |
| └─ close_type | String | 沖銷類別 ： 0現股、1融資、2融券、3信用當沖、4現股當沖、5現賣(未買回)/券差(買進) |
| └─ securities_transaction_tax | String | 證所稅 |
| └─ health_insurance_premium | String | 健保補充費 |
| └─ order_type_name2 | String | 委託類別 |
| └─ dividend_amount | String | 除息金額 |
| └─ securities_lending_differential_fee | String | 券差借券費 |
| sell_detail | object | 賣出詳情 |
| └─ filled_quantity | String | 成交數量 |
| └─ filled_amount | String | 成交金額 |
| └─ net_amount | String | 淨收付 |
| └─ margin_amount | String | 融資金額 |
| └─ guarantee_amount | String | 保證金金額 |
| └─ short_collateral | String | 融券擔保品 |
| └─ securities_lending_fee | String | 標借費 |
| └─ adjustment_date | String | 調整日期 |
| └─ order_type | String | 委託別 : 0 整股、1、3融資、2、4融券、 9現賣（擔保品） |
| └─ order_type_name | String | 委託類型名稱 |
| └─ buy_sell | String | 買賣方向 |
| └─ change_type | String | 變更類型 |
| └─ is_adjusted | String | 是否開放調整成本 |
| └─ io_flag | String | 異動代碼 |
| └─ io_name | String | 異動名稱 |
| └─ no | String | 編號 |
| └─ t_date | String | 交易日期 |
| └─ order_no | String | 委託序號 |
| └─ filled_no | String | 成交序號 |
| └─ closed_quantity | String | 沖銷股數 |
| └─ filled_price | String | 成交價格 |
| └─ closed_margin_amount | String | 償還融資金額 |
| └─ closed_shortCollateral | String | 償還擔保品 |
| └─ closed_guarantee_amount | String | 償還融券保證金 |
| └─ fee | String | 手續費 |
| └─ interest | String | 利息 |
| └─ tax | String | 稅金 |
| └─ short_selling_fee | String | 借券費 |
| └─ cost | String | 成本 |
| └─ cost_before_dividend | String | 成本 (不扣除息金額) |
| └─ income | String | 賣出收入 |
| └─ profit_loss | String | 損益 |
| └─ profit_loss_rate | String | 損益率 |
| └─ other_cost | String | 其他費用 ( 除手續費、交易稅外的費用項目 (資/券利息也包含在內) ) |
| └─ close_type | String | 沖銷類別 ： 0現股、1融資、2融券、3信用當沖、4現股當沖、5現賣(未買回)/券差(買進) |
| └─ securities_transaction_tax | String | 證所稅 |
| └─ health_insurance_premium | String | 健保補充費 |
| └─ order_type_name2 | String | 委託類別 |
| └─ dividend_amount | String | 除息金額 |
| └─ securities_lending_differential_fee | String | 券差借券費 |

### 請求範例

```
sdk.accounting.realized_profit_and_loses(account,"20241101","20241201")
```

### 回傳範例

```
RealizedProfitLossResponse = {
    no: "合計",                  # 編號 ( String )
    cost: "83618",               # 買入總成本 ( String )
    income: "81462",             # 賣出總收入 ( String )
    profit_loss: "-2156",        # 總損益 ( String )
    profit_loss_rate: "-2.58%",  # 總損益率 ( String )
    accumulated_cost: "0",       # 累計成本 ( String )
    accumulated_profit_loss: "-2156",        # 累計損益 ( String )
    accumulated_profit_loss_rate: "-2.58%",  # 累計損益率 ( String )
    short_selling_fee: "0",                  # 融券手續費 ( String )
    interest: "0",                           # 利息 ( String )
    closed_margin_amount : "0",              # 償還融資金額 ( String )
    dividend_amount : "0",                   # 股利金額 ( String )
    securities_lending_differential_fee : "0",  # 券差借券費 ( String )
    profit_loss_summary : [
        {
            no : "1",                # 編號 ( String )
            t_date : "20240808",     # 交易日期 ( String )
            filled_no : "0000001",   # 成交編號 ( String )
            closed_quantity : "1000",    # 平倉數量 ( String )
            filled_price : "81.70",      # 成交價格 ( String )
            closed_margin_amount : "0",  # 償還融資金額 ( String )
            closed_short_collateral : "0",  # 償還擔保品 ( String )
            closed_guarantee_amount : "0",  # 償還保證金 ( String )
            interest : "0",                 # 利息 ( String )
            short_selling_fee : "0",        # 融券費用 ( String )
            cost : "83618",                 # 買入成本 ( String )
            cost_before_dividend : "83618", # 買入成本 (未扣除股息) ( String )
            income : "81462",                # 賣出收入 ( String )
            profit_loss : "-2156",           # 損益 ( String )
            profit_loss_rate : "-2.58%",     # 損益率 ( String )
            other_cost : "0",                # 其他成本 ( String )
            closed_type : "4",               # 平倉類型 ( String )
            order_type_name2 : "現沖",       # 委託類型名稱2 ( String )
            dividend_amount : "0",           # 股息金額 ( String )
            securities_lending_differential_fee : "0",  # 券差借券費 ( String )
            branch_id : "5920",                         # 分公司代號 ( String )
            cust_id : "9816000",                        # 客戶帳號 ( String )
            name : "陳XXX",                             # 客戶姓名 ( String )
            order_type : "0",                           # 委託類型 ( String )
            order_type_name : "現股",                    # 委託類型名稱 ( String )
            buy_sell : "Sell",                          # 買賣方向 ( String )
            symbol : "3663",                            # 股票代號 ( String )
            symbol_name : "鑫科",                       # 股票名稱 ( String )
            target_price : "0",                         # 標的價格 ( String )
            portfolio_type : "",                        # 投資組合類型 ( String )
            buy_detail: RealizedProfitLossDetail {
                no : "1",                               # 編號 ( String )
                t_date : "20240808",                    # 交易日期 ( String )
                order_no : "o0179",                     # 委託序號 ( String )
                filled_no : "0000002",                  # 成交編號 ( String )
                closed_quantity : "1000",               # 平倉股數 ( String )
                filled_price : "83.50",                 # 成交價格 ( String )
                closed_margin_amount : "0",             # 償還融資金額 ( String )
                closed_short_collateral : "0",          # 償還擔保品 ( String )
                closed_guarantee_amount : "0",          # 償還保證金 ( String )
                fee : "118",                            # 手續費 ( String )
                interest : "0",                         # 利息 ( String )
                tax : "0",                              # 稅金 ( String )
                short_selling_fee : "0",                 # 融券費用 ( String )
                cost : "83618",                          # 買入成本 ( String )
                cost_before_dividend : "83618",          # 買入成本 (未扣除股息) ( String )
                income : "81462",                       # 賣出收入 ( String )
                profit_loss : "-2156",                  # 損益 ( String )
                profit_loss_rate : "-2.58%",             # 損益率 ( String )
                other_cost : "0",                       # 其他成本 ( String )
                closed_type : "4",                       # 平倉類型 ( String )
                securities_transaction_tax : "0",        # 證券交易稅 ( String )
                health_insurance_premium : "0",          # 健保費用 ( String )
                order_type_name2 : "買沖",               # 委託類型名稱2 ( String )
                dividend_amount : "0",                   # 股息金額 ( String )
                securities_lending_differential_fee : "0",  # 券差借券費 ( String )
                filled_quantity : "1000",                   # 成交數量 ( String )
                filled_amount : "83500",                    # 成交金額 ( String )
                net_amount : "-83618",                      # 淨支付金額 ( String )
                margin_amount : "0",                        # 融資金額 ( String )
                guarantee_amount : "0",                     # 保證金金額 ( String )
                short_collateral : "0",                     # 融券擔保品 ( String )
                securities_lending_fee : "0",               # 證券借貸費用 ( String )
                adjustment_date : "",                       # 調整日期 ( String )
                order_type : "0",                           # 委託類型 ( String )
                order_type_name : "現股",                    # 委託類型名稱 ( String )
                buy_sell : "B",                             # 買賣方向 ( String )
                change_type : "0",                          # 變更類型 ( String )
                is_adjusted : "N",                          # 是否已調整 ( String )
                io_flag : "",                               # 異動代碼 ( String )
                io_name : "",                               # 異動名稱 ( String )
            },
            sell_detail : RealizedProfitLossDetail  {
                no : "1",                                   # 編號 ( String )
                t_date : "20240808",                        # 交易日期 ( String )
                order_no : "g0050",                         # 委託序號 ( String )
                filled_no : "0000001",                      # 成交編號 ( String )
                closed_quantity : "1000",                   # 平倉股數 ( String )
                filled_price : "81.70",                     # 成交價格 ( String )
                closed_margin_amount : "0",                 # 償還融資金額 ( String )
                closed_short_collateral : "0",              # 償還擔保品 ( String )
                closed_guarantee_amount : "0",              # 償還保證金 ( String )
                fee : "116",                                # 手續費 ( String )
                interest : "0",                             # 利息 ( String )
                tax : "122",                                # 稅金 ( String )
                short_selling_fee : "0",                    # 融券費用 ( String )
                cost : "0",                                 # 成本 ( String )
                cost_before_dividend : "0",                 # 成本 (未扣除股息) ( String )
                income : "81462",                           # 賣出收入 ( String )
                profit_loss : "0",                          # 損益 ( String )
                profit_loss_rate : "100.00%",               # 損益率 ( String )
                other_cost : "0",                           # 其他成本 ( String )
                closed_type : "4",                          # 平倉類型 ( String )
                securities_transaction_tax : "0",           # 證券交易稅 ( String )
                health_insurance_premium : "0",             # 健保費用 ( String )
                order_type_name2 : "賣沖",                  # 委託類型名稱2 ( String )
                dividend_amount : "0",                      # 股息金額 ( String )
                securities_lending_differential_fee : "0",  # 券差借券費 ( String )
                filled_quantity : "1000",                   # 成交數量 ( String )
                filled_amount : "81700",                    # 成交金額 ( String )
                net_amount : "81462",                       # 淨收入金額 ( String )
                margin_amount : "0",                        # 融資金額 ( String )
                guarantee_amount : "0",                     # 保證金金額 ( String )
                short_collateral : "0",                     # 融券擔保品 ( String )
                securities_lending_fee : "0",               # 證券借貸費用 ( String )
                adjustment_date : "",                       # 調整日期 ( String )
                order_type : "0",                           # 委託類型 ( String )
                order_type_name : "現股",                   # 委託類型名稱 ( String )
                buy_sell : "S",                             # 買賣方向 ( String )
                change_type : "",                           # 變更類型 ( String )
                is_adjusted : None,                         # 是否已調整 ( None 或 String )
                io_flag : "",                               # 異動代碼 ( String )
                io_name : "",                               # 異動名稱 ( String )
            }
        }

    ]
}
```

---

<a id="sec21"></a>
## 21 Python · 帳務 · AccountStatement

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/accountManagement/AccountStatement

account_statment

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| start_date | String | 查詢起始日期 |
| end_date | String | 查尋迄日 |
| symbol | String ( Optional ) | 股票代號 |

### 未實現 StatementResponse 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| income | String | 賣出 |
| cost | String | 買入 |
| net_amount | String | 收付淨額 |
| fee | String | 手續費 |
| tax | String | 交易稅 |
| margin_short_day_trading_profit_loss | String | 融券當沖損益 |
| common_stock_day_trading_profit_loss | None | 普通股當沖損益 |
| securities_income_tax | String | 證券所得稅 |
| health_insurance_fee | String | 健保費 |
| filled_quantity | String | 成交股數 |
| interest | String | 利息 |
| short_selling_fee | String | 融券費 |
| filled_amount | String | 成交金額 |
| payment_gross_total | String | 付款總額 |
| profit_loss | String | 損益 |
| credit_debit_net_amount | String | 信用貸款淨額 |
| securities_lending_differential_fee | String | 證券借貸價差費 |
| account_summary | Object | 帳戶摘要 |
| └─ margin_position_market_value_sum | String | 融資市值總計 |
| └─ short_position_market_value_sum | String | 融券市值總計 |
| └─ short_collateral_sum | String | 融券擔保品總計 |
| └─ margin_limit | String | 融資限額 |
| └─ short_limit | String | 融券限額 |
| └─ guarantee_amount_sum | String | 保證金總計 |
| └─ margin_amount_sum | String | 融資金額總計 |
| └─ short_amount_sum | String | 融券金額總計 |
| └─ account_maintenance_rate | String | 帳戶維持率 |
| └─ settlement_today | String | 今日結算金額 |
| └─ settlement_yesterday | String | 昨日結算金額 |
| └─ settlement_net | String | 結算淨額 |
| bill_summary | Object | 帳單摘要 |
| └─ common_stock_buy_amount | String | 普通股買入金額 |
| └─ common_stock_sell_amount | String | 普通股賣出金額 |
| └─ common_stock_fee | String | 普通股手續費 |
| └─ common_stock_tax | String | 普通股稅金 |
| └─ common_stock_st_in_tax | String | 普通股證交稅 |
| └─ common_stock_net_amount | String | 普通股淨額 |
| └─ own_funds_amount | String | 自有資金金額 |
| └─ margin_amount | String | 融資金額 |
| └─ margin_fee | String | 融資手續費 |
| └─ margin_interest | String | 融資利息 |
| └─ margin_tax | String | 融資稅金 |
| └─ margin_securities_income_tax | String | 融資證券所得稅 |
| └─ margin_net_amount | String | 融資淨額 |
| └─ guarantee_amount | String | 保證金金額 |
| └─ short_collateral | String | 融券擔保品 |
| └─ short_fee | String | 融券手續費 |
| └─ short_interest | String | 融券利息 |
| └─ short_health_insurance_fee | String | 融券健保費 |
| └─ short_net_amount | String | 融券淨額 |
| └─ profit_loss | String | 損益 |
| └─ buy_quantity | String | 買進股數 |
| └─ sell_quantity | String | 賣出股數 |
| └─ net_amount | String | 淨額 |
| └─ securities_lending_differential_fee | String | 證券借貸價差費 |
| filled_records | list | 成交資訊 |
| └─ branch_id | String | 分公司代號 |
| └─ cust_id | String | 帳號 |
| └─ name | String | 姓名 |
| └─ symbol | String | 股票代號 |
| └─ symbol_name | String | 股票名 |
| └─ filled_date | String | 成交日期 |
| └─ order_no | String | 委託書號 |
| └─ filled_no | String | 成交序號 |
| └─ order_type | String | 委託別 : 0 整股、1 , 3 融資、2 , 4 融券、9 現賣 ( 擔保品 ) |
| └─ order_type_name | String | 委託別名稱 |
| └─ buy_sell | String | 買賣別 |
| └─ buy_sell_name | String | 買賣別名稱 |
| └─ market_type | String | 盤別 |
| └─ filled_price | String | 成交價 |
| └─ filled_qty | String | 成交股數 |
| └─ filled_amount | String | 成交值 |
| └─ tax | String | 交易稅 |
| └─ fee | String | 手續費 |
| └─ interest | String | 利息 |
| └─ reverse_interest | String | 融券利息 |
| └─ margin_amount | String | 信用金額 |
| └─ short_amount | String | 借貸金額 |
| └─ short_collateral | String | 擔保品 |
| └─ guarantee_amount | String | 融券保證金 |
| └─ short_selling_fee | String | 融券手續費 |
| └─ income | String | 淨收金額 |
| └─ cost | String | 淨付金額 |
| └─ securities_lending_fee | String | 標借費 |
| └─ net_amount | String | 預估淨額 |
| └─ own_funds_amount | String | 自備款 |
| └─ profit_loss | String | 損益 |
| └─ securities_transaction_income_tax | String | 證所稅 |
| └─ health_insurance_fee | String | 健保補充費 |
| └─ is_day_trade | String | 是否為當沖 |
| └─ securities_lending_differential_fee | String | 證券借貸價差費 |

### 請求範例

```
sdk.accounting.account_statment(account,"20241101","20241201")
```

### 回傳範例

```
StatementResponse {
    income: "0",                                   # 賣出 (String)
    cost: "0",                                     # 買入 (String)
    net_amount: "0",                               # 收付淨額 (String)
    fee: "0",                                      # 手續費 (String)
    tax: "0",                                      # 交易稅 (String)
    margin_short_day_trading_profit_loss: "0",     # 融券當沖損益 (String)
    common_stock_day_trading_profit_loss: None,    # 普通股當沖損益 (String)
    securities_income_tax: "0",                    # 證券所得稅 (String)
    health_insurance_fee: "0",                     # 健保費 (String)
    filled_quantity: "0",                          # 成交股數 (String)
    interest: "0",                                 # 利息 (String)
    short_selling_fee: "0",                        # 融券費 (String)
    filled_amount: "0",                            # 成交金額 (String)
    payment_gross_total: "0",                      # 付款總額 (String)
    profit_loss: "0",                              # 損益 (String)
    credit_debit_net_amount: "0",                  # 信用貸款淨額 (String)
    securities_lending_differential_fee: "0",      # 證券借貸價差費 (String)
    account_summary: AccountSummary {
        margin_position_market_value_sum: "0",     # 融資持倉市值總計 (String)
        short_position_market_value_sum: "0",      # 融券持倉市值總計 (String)
        short_collateral_sum: "0",                 # 融券擔保品總計 (String)
        margin_limit: "0",                         # 融資限額 (String)
        short_limit: "0",                          # 融券限額 (String)
        guarantee_amount_sum: "0",                 # 保證金總計 (String)
        margin_amount_sum: "0",                    # 融資金額總計 (String)
        short_amount_sum: "0",                     # 融券金額總計 (String)
        account_maintenance_rate: "",              # 帳戶維持率 (String)
        settlement_today: "0",                     # 今日結算金額 (String)
        settlement_yesterday: "0",                 # 昨日結算金額 (String)
        settlement_net: "0",                       # 結算淨額 (String)
    },
    bill_summary: BillSummary {
        common_stock_buy_amount: "0",              # 普通股買入金額 (String)
        common_stock_sell_amount: "0",             # 普通股賣出金額 (String)
        common_stock_fee: "0",                     # 普通股手續費 (String)
        common_stock_tax: "0",                     # 普通股稅金 (String)
        common_stock_st_in_tax: "0",               # 普通股證交稅 (String)
        common_stock_net_amount: "0",              # 普通股淨額 (String)
        own_funds_amount: "0",                     # 自有資金金額 (String)
        margin_amount: "0",                        # 融資金額 (String)
        margin_fee: "0",                           # 融資手續費 (String)
        margin_interest: "0",                      # 融資利息 (String)
        margin_tax: "0",                           # 融資稅金 (String)
        margin_securities_income_tax: "0",         # 融資證券所得稅 (String)
        margin_net_amount: "0",                    # 融資淨額 (String)
        guarantee_amount: "0",                     # 保證金金額 (String)
        short_collateral: "0",                     # 融券擔保品 (String)
        short_fee: "0",                            # 融券手續費 (String)
        short_interest: "0",                       # 融券利息 (String)
        short_health_insurance_fee: "0",           # 融券健保費 (String)
        short_net_amount: "0",                     # 融券淨額 (String)
        profit_loss: "0",                          # 損益 (String)
        buy_quantity: "0",                         # 買進股數 (String)
        sell_quantity: "0",                        # 賣出股數 (String)
        net_amount: "0",                           # 淨額 (String)
        securities_lending_differential_fee: "0",  # 證券借貸價差費 (String)
    },
    filled_records: [
        StatementFilledProfile {
            branch_id: "592a",                      # 分公司代號 (String)
            cust_id: "0456125",                     # 帳號 (String)
            name: "xxx",                            # 姓名 (String)
            symbol: "3231",                         # 股票代號 (String)
            symbol_name: "緯創",                    #  股票名 (String)
            filled_date: "20241119",                #  成交日期 (String)
            order_no: "i9294",                      #  委託書號 (String)
            filled_no: "0000004",                   #  成交序號 (String)
            order_type: "0",                        #  委託別 (String)
            order_type_name: "現買",                #  委託別名稱 (String)
            buy_sell: "B",                          #  買賣別 (String)
            buy_sell_name: "買",                    #  買賣別名稱 (String)
            market_type: "0",                       #  盤別 (String)
            filled_price: "113.5000",               #  成交價 (String)
            filled_qty: "1000",                     #  成交股數 (String)
            filled_amount: "113500",                #  成交值 (String)
            tax: "0",                               #  交易稅 (String)
            fee: "161",                             #  手續費 (String)
            interest: "0",                          #  利息 (String)
            reverse_interest: "0",                  #  融券利息 (String)
            margin_amount: "0",                     #  信用金額 (String)
            short_amount: "0",                      #  借貸金額 (String)
            short_collateral: "0",                  #  擔保品 (String)
            guarantee_amount: "0",                  #  融券保證金 (String)
            short_selling_fee: "0",                 #  融券手續費 (String)
            income: "0",                            #  淨收金額 (String)
            cost: "0",                              #  淨付金額 (String) 
            securities_lending_fee: "0",            #  標借費 (String)
            net_amount: "-113661",                  #  預估淨額 (String)
            own_funds_amount: "0",                  #  自備款 (String)
            profit_loss: "0",                       #  損益 (String)
            securities_transaction_income_tax: "0",  #  證所稅 (String)
            health_insurance_fee: "0",               #  健保補充費 (String)
            is_day_trade: "N",                       #  是否為當沖 (String)
            securities_lending_differential_fee: "0",  #  證券借貸價差費 (String)
        },
]

}
```

---

<a id="sec22"></a>
## 22 Python · 帳務 · QueryHistorySettlement

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/accountManagement/QueryHistorySettlement

history_settlement

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| start_date | string | 查詢起始日期 |
| end_date | string | 查詢結束日期 |

### 交割款 SettlementResponse 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account_summary | Object | 帳戶摘要 |
| └─ margin_position_market_value_sum | String | 融資市值加總 |
| └─ short_position_market_value_sum | String | 融券市值加總 |
| └─ short_collateral_sum | String | 融券擔保品加總 |
| └─ margin_limit | String | 融資限額 |
| └─ short_limit | String | 融券限額 |
| └─ guarantee_amount_sum | String | 融券保證金加總 |
| └─ margin_amount_sum | String | 融資金額加總 |
| └─ short_amount_sum | String | 融券金額加總 |
| └─ settlement_today | String | 今日結算金額 |
| └─ settlement_yesterday | String | 昨日結算金額 |
| └─ settlement_net | String | 結算淨額 |
| settlements | Array | 結算記錄 |
| └─ branch_id | String | 分公司代號 |
| └─ cust_id | String | 帳號 |
| └─ s_date | String | 交割日期 |
| └─ t_date | String | 交易日期 |
| └─ net_amount | String | 淨收付金額 |

### 請求範例

```
sdk.accounting.history_settlement(account,"20241001","20241010")
```

### 回傳範例

```
SettlementResponse = {
    account_summary: {                          # 帳戶摘要 (AccountSummary object)
        margin_position_market_value_sum: "0",  # 融資市值加總 (string)
        short_position_market_value_sum: "0",   # 融券市值加總 (string)
        short_collateral_sum: "0",              # 融券擔保品加總 (string)
        margin_limit: "0",                      # 融資限額 (string)
        short_limit: "0",                       # 融券限額 (string)
        guarantee_amount_sum: "0",              # 融券保證金加總 (string)
        margin_amount_sum: "0",                 # 融資金額加總 (string)
        short_amount_sum: "0",                  # 融券金額加總 (string)
        settlement_today: "0",                  # 今日交割金額 (string)
        settlement_yesterday: "0",              # 昨日交割金額 (string)
        settlement_net: "0",                    # 交割金額 (string)
    },
    settlements: [   # 結算記錄 (Array)
        SettlementDailySummary {
            branch_id: "592a",                 # 分公司代號
            cust_id: "123456",                 # 帳號
            s_date: "20241014",                # 交割日期
            t_date: "20241009",                # 交易日期
            net_amount: "-1640300.00"          # 淨收付金額
        }
    ]                             
}
```

---

<a id="sec23"></a>
## 23 Python · 帳務 · QueryTodaySettlement

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/accountManagement/QueryTodaySettlement

today_settlement

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |

### 交割款 PaymentResponse 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| s_date | String | 交割日期 |
| t_date | String | 交易日期 |
| net_amount | String | 總淨收付金額 |
| settle_sum | Object | 現金結算彙總 |
| └─ buy_amount | String | 今日現股買金額 |
| └─ sell_amount | String | 今日現股賣金額 |
| └─ fee | String | 手續費 |
| └─ tax | String | 交易稅 |
| └─ net_amount | String | 淨收付金額 |
| settle_credit_sum | Object | 融資結算摘要 |
| └─ margin_quantity | String | 當日融資額度 |
| └─ margin_quantity_left | String | 當日可用融資餘額 |
| └─ margin_collateral | String | 融資自備款 |
| └─ margin_collateral_buy | String | 融資自備款買入 |
| └─ margin_collateral_sell | String | 融資自備款賣出 |
| └─ margin_amount | String | 融資金額 |
| └─ margin_amount_buy | String | 融資買入金額 |
| └─ margin_amount_sell | String | 融資賣出金額 |
| └─ margin_net_amount_buy | String | 融資買入應收付金額 |
| └─ margin_net_amount_sell | String | 融資賣出應收付金額 |
| └─ interest | String | 融資利息 |
| └─ fee | String | 手續費 |
| └─ tax | String | 交易稅 |
| └─ net_amount | String | 淨收付金額 |
| settle_debit_sum | Object | 融券結算摘要 |
| └─ short_quantity | String | 當日融券額度 |
| └─ short_quantity_left | String | 當日可用融資餘額 |
| └─ guarantee_amount | String | 融券保證金 |
| └─ guarantee_amount_buy | String | 融券保證金券買 |
| └─ guarantee_amount_sell | String | 融券保證金券賣 |
| └─ short_collateral | String | 融券擔保品 |
| └─ short_collateral_buy | String | 融券擔保品券買 |
| └─ short_collateral_sell | String | 融券擔保品券賣 |
| └─ short_net_amount_buy | String | 融券券買應收付金額 |
| └─ short_net_amount_sell | String | 融券券賣應收付金額 |
| └─ short_selling_fee | String | 融券手續費 |
| └─ interest | String | 融券利息 |
| └─ net_amount | String | 融券淨收付金額 |

### 請求範例

```
sdk.accounting.today_settlement(account)
```

### 回傳範例

```
PaymentResponse = {
    s_date: "20241209",                      # 交割日期 (string)
    t_date: "20241205",                      # 交易日期 (string)
    net_amount: "-150213",                   # 總淨收付金額 (string)
    settle_sum: {                            # 現金結算摘要 
        buy_amount: "150000",                # 今日現股買金額 (string)
        sell_amount: "0",                    # 今日現股賣金額 (string)
        fee: "213",                          # 手續費 (string)
        tax: "0",                            # 交易稅 (string)
        net_amount: "0",                     # 淨金額 (string)
    },
    settle_credit_sum: {                     # 融資結算摘要 
        margin_quantity: "0",                # 當日融資額度 (string)
        margin_quantity_left: "0",           # 剩餘融資數量 (string)
        open_short_collateral: "0",          # 融資自備款 (string)
        open_short_collateral_buy: "0",      # 融資自備款買入 (string)
        open_short_collateral_sell: "0",     # 融資自備款賣出 (string)
        margin_amount: "0",                  # 融資金額 (string)
        margin_amount_buy: "0",              # 融資買入金額 (string)
        margin_amount_sell: "0",             # 融資賣出金額 (string)
        margin_net_amount_buy: "0",          # 融資淨買入金額 (string)
        margin_net_amount_sell: "0",         # 融資淨賣出金額 (string)
        interest: "0",                       # 融資利息 (string)
        fee: "0",                            # 費用 (string)
        tax: "0",                            # 交易稅 (string)
        net_amount: "0",                     # 融資淨額 (string)
    },
    settle_debit_sum: {                      # 融券結算摘要 (SettlementShortSummary object)
        short_quantity: "0",                 # 融券數量 (string)
        short_quantity_left: "0",            # 當日可用融資餘額 (string)
        guarantee_amount: "0",               # 保證金金額 (string)
        guarantee_amount_buy: "0",           # 融券保證金券買 (string)
        guarantee_amount_sell: "0",          # 融券保證金券賣 (string)
        short_collateral: "0",               # 融券擔保品 (string)
        short_collateral_buy: "0",           # 融券擔保品券買 (string)
        short_collateral_sell: "0",          # 融券擔保品券賣 (string)
        short_net_amount_buy: "0",           # 融券券買應收付金額 (string)
        short_net_amount_sell: "0",          # 融券券賣應收付金額 (string)
        short_selling_fee: "0",              # 融券手續費 (string)
        interest: "0",                       # 融券利息 (string)
        net_amount: "0",                     # 融券淨收付金額 (string)
    }
}
```

---

<a id="sec24"></a>
## 24 Python · 帳務 · Balance

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/accountManagement/Balance

> **注意：**
> 如是約定新光銀交割，請用 [新光銀餘額查詢](https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/accountManagement/SkBankBalance)

bank_balance

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |

### 餘額 Bankbalace 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| available_balance | double | 可用餘額 |
| reserved_amount | double | 圈存金額 |
| dedicated_account_balance | double | 專戶餘額 |
| withdrawal_bank_code | string | 出金銀行代號 |
| withdrawal_bank | string | 出金銀行名稱 |
| withdrawal_account | string | 出金銀行帳號 |
| deposit_bank_code | string | 入金銀行代號 |
| deposit_account | string | 入金銀行帳號 |

### 請求範例

```
sdk.accounting.bank_balance(accounts[0])
```

### 回傳範例

```
Bankbalace{
        available_balance: "7015.00",             # 可用餘額 (double)
        reserved_amount: "2041.00",               # 圈存金額 (double)
        dedicated_account_balance: "9056.00",     # 專戶餘額 (double)
        withdrawal_bank_code: "803",              # 出金銀行代號 (string)
        withdrawal_bank: "聯邦",                   # 出金銀行名稱 (string)
        withdrawal_account: "046508006075",       # 出金銀行帳號 (string)
        deposit_bank_code: "1030851",             # 入金銀行代號 (string)
        deposit_account: "89600221676687"         # 入金銀行帳號 (string)
}
```

---

<a id="sec25"></a>
## 25 Python · 帳務 · SKBankBalance

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/accountManagement/SKBankBalance

> **注意：**
> 如是約定分戶帳交割，請用 [分戶帳餘額查詢](https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/accountManagement/Balance)

skbank_balance

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |

### 餘額 SKBankbalace 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| balance | double | 帳戶餘額 |
| available_balance | double | 可用餘額 |
| currency | string | 幣別 |
| branch_id | string | 分公司 |
| cust_id | string | 帳號 |
| bank_account | string | 銀行帳號 |

### 請求範例

```
sdk.accounting.skbank_balance(account[0])
```

### 回傳範例

```
SKBankbalace{
        balance: "7015.00",                       # 帳戶餘額 (double)
        available: "7015.00",                     # 可用餘額 (double)
        currency: "TWD",                          # 幣別 (string)
        branch_id: "592W",                        # 分公司代號 (string)
        cust_id: "1222344",                       # 證券帳號 (string)
        bank_account: "046508006075"             # 銀行帳號 (string)

}
```

---

<a id="sec26"></a>
## 26 Python · 取得交易日

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/GetMarketTime

get_market_time

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| date | String | 查詢日期 |

### TradingSchedule 回傳

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| regular | Object | 正常交易時段 |
| └─ open_time | String | 正常交易開始時間（"0930"） |
| └─ close_time | String | 正常交易結束時間（"1800"） |
| after_market | Object | 盤後交易時段 |
| └─ open_time | String | 盤後交易開始時間（"1400"） |
| └─ close_time | String | 盤後交易結束時間（"1600"） |
| odd_lot | Object | 零股交易時段 |
| └─ open_time | String | 零股交易開始時間（"1400"） |
| └─ close_time | String | 零股交易結束時間（"1600"） |
| intraday_odd_lot | Object | 零股當日盤交易時段 |
| └─ open_time | String | 零股當日盤交易開始時間（"0930"） |
| └─ close_time | String | 零股當日盤交易結束時間（"1800"） |
| emg | Object | 興櫃交易時段 |
| └─ open_time | String | 興櫃交易開始時間（"1100"） |
| └─ close_time | String | 興櫃交易結束時間（"1900"） |
| is_trading_day | Boolean | 是否為交易日（true/false） |
| last_trading_day | String | 上一個交易日（"20240916"） |
| next_trading_day | String | 下一個交易日（"20240919"） |
| next_trading_day2 | String | 下下個交易日（"20240920"） |

### Request Example

```
sdk.get_market_time("20241008")
```

### Response Example

```
TradingSchedule {
    regular: TimeRange {   
        open_time: "0930",   # 正常交易開始時間 (String)
        close_time: "1800",  # 正常交易結束時間 (String)
    },
    after_market: TimeRange {   
        open_time: "1400",   # 盤後交易開始時間 (String)
        close_time: "1600",  # 盤後交易結束時間 (String)
    },
    odd_lot: TimeRange {   
        open_time: "1400",   # 零股交易開始時間 (String)
        close_time: "1600",  # 零股交易結束時間 (String)
    },
    intraday_odd_lot: TimeRange {   
        open_time: "0930",   # 零股當日盤交易開始時間 (String)
        close_time: "1800",  # 零股當日盤交易結束時間 (String)
    },
    emg: TimeRange {   
        open_time: "1100",   # 興櫃交易開始時間 (String)
        close_time: "1900",  # 興櫃交易結束時間 (String)
    },
    is_trading_day: true,   # 是否為交易日 (Boolean)
    last_trading_day: "20241007",   # 上一個交易日 (String)
    next_trading_day: "20241009",   # 下一個交易日 (String)
    next_trading_day2: "20241011",  # 下下個交易日 (String)
}
```

---

<a id="sec27"></a>
## 27 Python · 參數對照表

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/EnumMatrix

### 類別

Class

#### OrderObject

| Parameter | Type | Meaning |
| --- | --- | --- |
| buy_sell | BSAction | 買賣別 : Buy、Sell |
| symbol | string | 股票代號 |
| price | string | 委託價格 |
| quantity | int | 委託數量 |
| market_type | MarketType | 盤別 可選用參數Common 整股、Fixing定盤、IntradayOdd 盤中零股、Odd 盤後零股、Emg 興櫃 |
| price_type | PriceType | 價格旗標 : 可選用參數為 Limit限價、LimitUp漲停、LimitDown跌停、Market市價、Reference平盤 |
| time_in_force | TimeInForce | 委託條件: 可選用參數為 ROD、FOK、IOC |
| order_type | OrderType | 委託類別 : 可選用參數為 Stock現股、Margin融資、Short融券、DayTradeShort現股當沖（for 現沖先賣） |

> **注意：**
> 不同 MarketType 對應的 quantity 之單位及範圍不同，請參考 [盤別](#markettype) 說明。

> **注意：**
> 當 MarketType 爲 MarketType.Common, MarketType.Odd,  MarketType.IntradayOdd 其中之一，且 priceType 爲 PriceType.Limit 時，需填入 price 欄位，其餘時候 price 欄位為空值或為None。

> **注意：**
> 現沖先賣時 , order_type = DayTradeShort , buy_sell 需為 Sell , market_type 需為Common

#### OrderRecord

委託列表，透過 [get_order_result(accounts)](https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/trade/GetOrderResults) 取得。

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| work_date | String | 有效交易日期 |
| order_date | String | 委託日期 |
| order_time | String | 委託時間 |
| sys_code | String | 來源別 |
| order_no | String | 委託書號 |
| symbol | String | 股票代號 |
| buy_sell | BSAction | 買賣方向 :Buy 買、Sell 賣 |
| market | String | 市場 |
| market_type | MarketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg、 興櫃、IntradayOdd 盤中零股 |
| price_type | PriceType | 價格類型 : Limit 限價、Market 市價、LimitUp 漲停價 、 LimitDown 跌停價、Reference 平盤價、 、 |
| time_in_force | TimeInForce | 委託條件別 : ROD 、 IOC 、 FOK |
| order_type | OrderType | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券、ShortSale 借券、 |
| order_price | Double | 委託價格 |
| org_qty | Int | 原始下單股數 |
| filled_qty | Int | 已成交股數 |
| cel_qty | Int | 已取消股數 |
| can_cancel | Boolean | 是否可取消 : true 可取消、false不可取消 |
| err_code | String | 錯誤代碼 |
| err_msg | String | 錯誤訊息 |
| seq_no | String | 流水號 |
| is_pre_order | Boolean | 是否預約單 : true 是預約單、false不是預約單 |
| pre_order_no | String | 預約單號碼 |
| avg_price | Double | 成交均價 |
| chg_time | String | 變動時間 |
| chg_date | String | 變動日期 |

#### Ack Object

委託回報物件

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| work_date | String | 有效交易日期 |
| order_date_time | String | 原始委託日期 |
| org_request_no | String | 原始委託 Request 序號 |
| sys_code | String | 來源別 |
| org_sys_code | String | 原始委託來源 |
| request_no | String | 刪改委託 Request 序號 |
| order_no | String | 委託書號 |
| symbol | String | 股票代號 |
| buy_sell | BSAction | 買賣方向 :Buy 買、Sell 賣 |
| market_type | MarketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg、 興櫃、IntradayOdd 盤中零股 |
| price_type | PriceType | 價格類型 : Limit 限價、Market 市價、 LimitUp漲停價、LimitDown跌停價、Reference平盤價 |
| time_in_force | TimeInForce | 委託條件別 : ROD 、 IOC 、 FOK |
| order_type | OrderType | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券 |
| order_price | Double | 委託價格 |
| org_qty | Int | 原始下單股數 |
| filled_qty | Int | 已成交股數 |
| cel_qty | Int | 已取消股數 |
| can_cancel | Boolean | 是否可取消 |
| err_code | String | 錯誤代碼 |
| err_msg | String | 錯誤訊息 |
| act | String | 新單 / 刪改 : 0 新單、M改量、C刪單、R改價 |
| kind | String | 種類 : ACK 委託 MAT 成交 |
| account | String | 帳號 |
| before_qty | Int | 變更前股數 |
| after_qty | Int | 變更後股數 |
| line_no | String | 行號 |
| order_seq_no | String | 流水號 |
| is_pre_order | Boolean | 是否預約單 : true 是預約單、false不是預約單 |
| org_pre_order_no | String | 原始預約單委託書編號 |
| pre_order_no | String | 預約單號碼 |

#### Mat Object

成交回報物件

| 參數 | 類型 | 說明 |
| --- | --- | --- |
| order_no | String | 委託書號 |
| org_sys_code | String | 原始委託來源別 |
| symbol | String | 股票代號 |
| order_seq_no | String | 網單序號 |
| mkt_seq_no | String | 成交序號 |
| market_type | MarketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg、 興櫃、IntradayOdd 盤中零股 |
| buy_sell | BsAction | 買賣方向 : Buy 買、Sell 賣 |
| order_type | OrderType | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券 |
| pay_price | Int | 價金 |
| line_no | String | 行號 |
| kind | String | 種類:MAT 成交 、ACK 委託 |
| account | String | 帳號 |
| filled_time | String | 成交時間 |
| filled_qty | Int | 成交股數 |
| filled_price | Double | 成交價格 |

#### Account

帳號資訊

| Parameter | Type | Meaning |
| --- | --- | --- |
| account | string | 分公司+帳號 |
| account_type | string | 帳號類型 |
| s_mark | string | 現股當沖狀態 : B 可先賣後買與先買後賣、 Y、A 可先買後賣、其餘回傳未符合資格 |
| name | string | 姓名 |

### Constants ( 欄位對應數值 )

#### BSAction

買賣別 : `Buy`、`Sell`  (buySell)

| Name | Meaning |
| --- | --- |
| Buy | 買 |
| Sell | 賣 |

#### MarketType

盤別

| Name | Meaning |
| --- | --- |
| Common | 整股 |
| Fixing | 定盤 |
| IntradayOdd | 盤中零股 |
| Odd | 盤後零股 |
| Emg | 興櫃 |
| EmgOdd | 興櫃零股 |

使用不同 MarketType 時，相對應的Quantity所代表的單位及範圍也會不同，詳如下表:

| Name | Quantity Unit | Quantity Ranges |
| --- | --- | --- |
| Common | 千股 | 1000 ~ 499000 |
| Fixing | 千股 | 1000 ~ 499000 |
| IntradayOdd | 股 | 1 ~ 999 |
| Odd | 股 | 1 ~ 999 |
| Emg | 千股 | 1000 ~ 499000 |
| EmgOdd | 股 | 1 ~ 999 |

使用不同 MarketType 時，可使用的 PriceType , TimeInForce 會不同，詳如下表：

| MarketType | Available PriceType | Available TimeInForce |
| --- | --- | --- |
| Common | Limit 、 LimitUp 、 LimitDown 、 Market 、 Reference | ROD 、 IOC 、 FOK |
| Fixing | Reference | ROD |
| IntradayOdd | Limit 、 LimitUp 、 LimitDown 、 Reference | ROD |
| Odd | Limit 、 LimitUp 、 LimitDown 、 Reference | ROD |
| Emg | Limit | ROD |
| EmgOdd | Limit | ROD |

#### PriceType

價格類型 (priceType)

| Name | Meaning |
| --- | --- |
| Limit | 限價 |
| LimitUp | 漲停 |
| LimitDown | 跌停 |
| Market | 市價 |
| Reference | 參考價 (定盤時為定盤價) |

#### TimeInForce

委託條件 (TimeInForce)

| Name | Meaning |
| --- | --- |
| ROD | 當日有效(Rest of Day) |
| FOK | 全部成交否則取消(Fill-or-Kill) |
| IOC | 立即成交否則取消(Immediate-or-Cancel) |

#### OrderType

委託類別 (orderType)

| Name | Meaning |
| --- | --- |
| Stock | 現股 |
| Margin | 融資 |
| Short | 融券 |
| DayTradeShort | 現股當沖賣 |

#### market

市場

| Name | Value |
| --- | --- |
| 上市 | T |
| 上櫃 | O |
| 興櫃 | R |

#### QueryType

查詢類別 (QueryType)

| Name | Meaning |
| --- | --- |
| All | 全部 |
| Reservation | 預約單 |
| RegularSession | 盤中 |
| Cancelable | 可取消委託 |
| Failed | 失敗單 |

---

<a id="sec28"></a>
## 28 Python · API 資格開通

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/python/RegisterApi

register_api_auth

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |

### 回傳

Return type: bool

### 請求範例

```
from taishin_sdk import TaishinSDK, Order, BSAction, TimeInForce, OrderType, PriceType, MarketType

sdk = TaishinSDK()

accounts = sdk.login("您的身分證字號", "您的登入密碼", "您的憑證位置", "您的憑證密碼")

print(accounts) #若有多帳號，則回傳多個

sdk.register_api_auth(accounts[0]) # 放入已簽屬完成的帳號
```

### 回傳範例

```
True
```

---

<a id="sec29"></a>
## 29 Node.js · 登入

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/login

login

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| personalID | String | 登入的ID |
| password | String | 登入的密碼 |
| certPath | String | 憑證路徑 |
| certPass | String | 憑證密碼 |

### 帳號資訊 Account 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| branchName | String | 分公司名 |
| name | String | 客戶姓名 |
| account | String | 客戶帳號 |
| accountType | string | 帳號類型 回傳 stk 證券 |
| sMark | String | 現股當沖狀態 : B 可先賣後買與先買後賣、 Y、A 可先買後賣、其餘回傳未符合資格 |

### 請求範例

```
const { TaishinSDK, BSAction, TimeInForce, OrderType, PriceType, MarketType } = require('taishin-sdk');

const sdk = new TaishinSDK();

const accounts = sdk.login("Your ID", "Your Password","Your Cert Path","Your Cert Password");

console.log(accounts);
```

### 回傳範例

```
[{
    branchName :"桃園",
    account: "592v980000",
    accountType: "stk",
    sMark: "N",
    name: "許",
}, {
    branchName :"營業部",
    account: "5920981100",
    accountType: "stk",
    sMark: "N",
    name: "許",
}, {
    branchName :"松德",
    account: "592a980222",
    accountType: "stk",
    sMark: "N",
    name: "許"
}]
```

---

<a id="sec30"></a>
## 30 Node.js · 交易 · PlaceOrder

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/trade/PlaceOrder

placeOrder

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| OrderObject | OrderObject | 委託內容 |

### 委託資訊 PlaceOrderResponse 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| orderDate | String | 委託日期 |
| orderTime | String | 委託時間 |
| workDate | String | 有效交易日期 |
| isPreOrder | Bool | 預約單註記 |
| orderNo | String | 委託書號 |

### 請求範例

```
const order = {
  buySell: BSAction.Buy,
  symbol: "2888",
  price: "8.90",
  quantity: 2000,
  marketType: MarketType.Common,
  priceType: PriceType.Limit,
  timeInForce: TimeInForce.ROD,
  orderType: OrderType.Stock
};

sdk.stock.placeOrder(accounts.data[0],order,false);
```

### 回傳範例

```
{
    orderDate: "20241004",   // 委託日期 (String)
    orderTime: "152549030",  // 委託時間 (String)
    workDate: "20241004",    // 有效交易日期 (String)
    isPreOrder: false,       // 委託單狀態 (Bool)
    orderNo: "g0002"         // 委託書編號 (String)    
}
```

---

<a id="sec31"></a>
## 31 Node.js · 交易 · GetOrderResults

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/trade/GetOrderResults

getOrderResults

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| queryType | QueryType | 盤別 : All 全部、Reservation 預約單 、RegularSession 盤中、Cancelable 可取消委託、Failed 失敗單 |

### 委託資訊 OrderRecord 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| workDate | String | 有效交易日期 |
| orderDate | String | 委託日期 |
| orderTime | String | 委託時間 |
| sysCode | String | 來源別 |
| orderNo | String | 委託書號 |
| symbol | String | 股票代號 |
| buySell | BSAction | 買賣方向 :Buy 買、Sell 賣 |
| market | String | 市場 :T上市、O上櫃、R興櫃 |
| marketType | marketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg 興櫃、IntradayOdd 盤中零股 |
| priceType | PriceType | 價格類型 : Limit 限價、Market 市價、LimitUp 漲停價 、 LimitDown 跌停價、Reference 平盤價 |
| timeInForce | TimeInForce | 委託條件別 : ROD 、 IOC 、 FOK |
| orderType | OrderType | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券、DayTradeShort 現沖賣 |
| orderPrice | Number | 委託價格 |
| orgQty | Number | 原始下單股數 |
| filledQty | Number | 已成交股數 |
| celQty | Number | 已取消股數 |
| canCancel | Boolean | 是否可取消 : true 可取消、false不可取消 |
| errCode | String | 錯誤代碼 |
| errMsg | String | 錯誤訊息 |
| seqNo | String | 流水號 |
| isPreOrder | Boolean | 是否預約單 : true 是預約單、false不是預約單 |
| preOrderNo | String | 預約單號碼 |
| avgPrice | Number | 成交均價 |
| chgTime | String | 變動時間 |
| chgDate | String | 變動日期 |

### 請求範例

```
const orders = sdk.stock.getOrderResults(accounts);
console.log(orders);

// 帶入查詢參數
// sdk.stock.getOrderResults(accounts[0], QueryType.All)
```

### 回傳範例

```
{
    workDate: "20241007",          // 有效交易日期 (String)
    orderDate: "20241007",         // 委託日期 (String)
    orderTime: "153823610",        // 委託時間 (String)
    sysCode: "4U",                 // 來源別 (String)
    orderNo: "f0002",              // 委託書號 (String)
    symbol: "2889",                // 股票代號 (String)
    buySell: "Buy",                // 買賣方向 (BSAction)
    market: "T",                   // 市場 (String)
    marketType: "Common",          // 盤別 (MarketType)
    priceType: "Limit",            // 價格類型 (Enum)
    timeInForce: "ROD",            // 委託條件 (Enum)
    orderType: "0",                // 委託類型 (String)
    orderPrice: 15.0,              // 委託價格 (Double)
    orgQty: 300000,                // 原始下單股數 (Int)
    filledQty: 300000,             // 已成交數量 (Int)
    celQty: 0,                     // 已取消數量 (Int)
    canCancel: false,              // 是否可取消 (Boolean)
    errCode: "000000",             // 錯誤代碼 (String)
    errMsg: "",                    // 錯誤訊息 (String)
    seqNo: "10000043",             // 流水號 (String)
    isPreOrder: false,             // 是否預約單 (Boolean)
    preOrderNo: "",                // 預約單號碼 (String)
    avgPrice: 15.0,                // 平均成交價格 (Double)
    chgTime: "153823610",          // 異動時間 (String)
    chgDate: "20241007",           // 異動日期 (String)
}
```

---

<a id="sec32"></a>
## 32 Node.js · 交易 · ModifyPrice

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/trade/ModifyPrice

modifyPrice

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | [Account] | 帳號 |
| OrderRecord | OrderRecord | 預計修改的委託單 |
| price | string | 修改後的價格 |
| priceType | PriceType | 修改後的價格旗標 : Limit 限價、Market 市價、LimitUp 漲停價 、 LimitDown 跌停價、Reference 平盤價 |

> **注意：**
> 僅盤前可以修改 PriceType，盤中時段不支援改 PriceType

> **注意：**
> 當 price 欄位有填入值時，priceType 欄位 Limit ； 當 priceType 不為 Limit 時，price 為 `0`

### 修改資訊 ModifiedResponse 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| order_date | String | 委託日期 |
| order_time | String | 委託時間 |

### 請求範例

```
// 單筆阻塞改價
sdk.stock.modifyPrice(accounts, orderRecord, "13.5", PriceType.Limit)
```

### 回傳範例

```
{
    orderDate: "20241007",         // 委託日期 (String)
    orderTime: "153823610"        // 委託時間 (String)
}
```

---

<a id="sec33"></a>
## 33 Node.js · 交易 · ModifyQuantity

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/trade/ModifyQuantity

modifyVolume

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| orderRecord | orderRecord | 預計修改的委託單 |
| volume | number | 刪減的股數 (設為 0 表刪單) |

### 修改資訊 OrderRecord 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| order_date | String | 委託日期 |
| order_time | String | 委託時間 |

### 請求範例

```
sdk.stock.modifyVolume(accounts, orderRes, 200000)
```

### 回傳範例

```
{
    orderDate: "20241007",         // 委託日期 (String)
    orderTime: "153823610"        // 委託時間 (String)
}
```

---

<a id="sec34"></a>
## 34 Node.js · 交易 · GetFilled

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/trade/GetFilled

getFilled

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| symbol | string ( Optional ) | 股票代號 |

### 成交資訊 FilledRecordOutput 欄位

Return type : Object

| 參數 | 類型 | 說明 |
| --- | --- | --- |
| orderNo | String | 委託書號 |
| sysCode | String | 來源別 |
| symbol | String | 股票代號 |
| mktSeqNo | String | 成交序號 |
| marketType | MarketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg、 興櫃、IntradayOdd 盤中零股 |
| market | String | 市場 : T 上市、O上櫃、R興櫃 |
| buySell | BSAction | 買賣方向 : Buy 買、Sell 賣 |
| orderType | OrderType | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券、DayTradeShort 現股當沖賣 |
| payment | Double | 應收付總金額 |
| filledDate | String | 成交日期 |
| filledTime | String | 成交時間 |
| filledQty | Int | 成交股數 |
| filledPrice | Double | 成交價格 |

### 請求範例

```
const getfilled = sdk.stock.getFilled(account);
console.log(getfilled)
```

### 回傳範例

```
{
    orderNo: "g0002",                // 委託書號 (String)
    sysCode: "4U",                   // 來源別 (String)
    symbol: "2889",                  // 股票代號 (String)
    mktSeqNo: "00000009",            // 成交序號 (String)
    marketType: 1,                   // 盤別 (Int)
    market: "T",                     // 市場 (String)
    buySell: "Buy",                  // 買賣方向 (BsAction)
    orderType: "Common",             // 委託單類型 (OrderType)
    payment: 15000.0,                // 應收付總金額 (Double)
    filledDate: "20241004",          // 成交日期 (String)
    filledTime: "152549030",         // 成交時間 (String)
    filledQty: 1000,                 // 成交股數 (Int)
    filledPrice: 15.0,               // 成交價格 (Double)
}
```

---

<a id="sec35"></a>
## 35 Node.js · 交易 · GetFilledDetail

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/trade/GetFilledDetail

getFilledDetail

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| symbol | string ( Optional ) | 股票代號 |

### 成交資訊 FilledDetailOutput 欄位

Return type : Object

| 參數 | 類型 | 說明 |
| --- | --- | --- |
| orderNo | String | 委託書號 |
| sysCode | String | 來源別 |
| symbol | String | 股票代號 |
| marketType | MarketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg、 興櫃、IntradayOdd 盤中零股 |
| market | String | 市場 : T 上市、O上櫃、R興櫃 |
| buySell | BSAction | 買賣方向 : Buy 買、Sell 賣 |
| orderType | OrderType | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券、DayTradeShort 現股當沖賣 |
| payment | Double | 應收付總金額 |
| filledDate | String | 成交日期 |
| filledQty | Int | 成交股數 |
| filledPrice | Double | 成交價格 |

### 請求範例

```
const getfilled = sdk.stock.getFilled(account);
console.log(getfilled)
```

### 回傳範例

```
{
    orderNo: "g0002",                // 委託書號 (String)
    sysCode: "4U",                   // 來源別 (String)
    symbol: "2889",                  // 股票代號 (String)
    mktSeqNo: "00000009",            // 成交序號 (String)
    marketType: 1,                   // 盤別 (Int)
    market: "T",                     // 市場 (String)
    buySell: "Buy",                  // 買賣方向 (BsAction)
    orderType: "Common",             // 委託單類型 (OrderType)
    payment: 15000.0,                // 應收付總金額 (Double)
    filledDate: "20241004",          // 成交日期 (String)
    filledTime: "152549030",         // 成交時間 (String)
    filledQty: 1000,                 // 成交股數 (Int)
    filledPrice: 15.0,               // 成交價格 (Double)
}
```

---

<a id="sec36"></a>
## 36 Node.js · 交易 · OrderHistory

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/trade/OrderHistory

orderHistory

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| startDate | string | 查詢開始日 ( YYYYMMDD ) |
| endDate | string | 查詢終止日 ( YYYYMMDD ) |

### OrderRecord 回傳

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| workDate | String | 有效交易日期 |
| orderDate | String | 委託日期 |
| orderTime | String | 委託時間 |
| sysCode | String | 來源別 |
| orderNo | String | 委託書號 |
| symbol | String | 股票代號 |
| buySell | BSAction | 買賣方向 :Buy 買、Sell 賣 |
| market | String | 市場 :T上市、O上櫃、R興櫃 |
| marketType | marketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg 興櫃、IntradayOdd 盤中零股 |
| priceType | PriceType | 價格類型 : Limit 限價、Market 市價、LimitUp 漲停價 、 LimitDown 跌停價、Reference 平盤價 |
| timeInForce | TimeInForce | 委託條件別 : ROD 、 IOC 、 FOK |
| orderType | OrderType | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券、DayTradeShort 現沖賣 |
| orderPrice | Number | 委託價格 |
| orgQty | Number | 原始下單股數 |
| filledQty | Number | 已成交股數 |
| celQty | Number | 已取消股數 |
| canCancel | Boolean | 是否可取消 : true 可取消、false不可取消 |
| errCode | String | 錯誤代碼 |
| errMsg | String | 錯誤訊息 |
| seqNo | String (optional) | 流水號 |
| isPreOrder | Boolean (optional) | 是否預約單 : true 是預約單、false不是預約單 |
| preOrderNo | String (optional) | 預約單號碼 |
| avgPrice | Number (optional) | 成交均價 |
| chgTime | String (optional) | 變動時間 |
| chgDate | String (optional) | 變動日期 |

### 請求範例

```
const orderHistory = sdk.stock.orderHistory(account,"20230921","20231020");
console.log(orderHistory);
```

### 回傳範例

```
[
    {
        workDate: "20241007",          // 有效交易日期 (String)
        orderDate: "20241007",         // 委託日期 (String)
        orderTime: "153718236",        // 委託時間 (String)
        sysCode: "4U",                 // 來源別 (String)
        orderNo: "",                   // 委託書號 (String)
        symbol: "2889",                // 股票代號 (String)
        buySell: "Buy",                // 買賣方向: `Buy` 買 (String)
        market: "T",                   // 市場代號（"T"：台股）(String)
        marketType: "Common",          // 盤別 (String)
        priceType: "Limit",            // 價格類型 (String)
        timeInForce: "ROD",            // 委託條件 (String)
        orderType: "0",                // 委託類型 (String)
        orderPrice: 15.0,              // 委託價格 (Double)
        orgQty: 150000,                // 委託數量 (Int)
        filledQty: 0,                  // 已成交數量 (Int)
        celQty: 0,                     // 已取消數量 (Int)
        canCancel: false,              // 是否可取消 (Boolean)
        errCode: "889",                // 錯誤代號 (String)
        errMsg: "委託額度逾電交投資能力, 請洽營業員！",  // 錯誤訊息 (String)
        seqNo: null,                   // 流水號 (String)
        isPreOrder: null,              // 是否為預訂單 (Boolean)
        preOrderNo: null,              // 預訂單號碼 (String)
        avgPrice: null,                // 平均成交價格 (Double)
        chgTime: null,                 // 異動時間 (String)
        chgDate: null                  // 異動日期 (String)
    },
    {
        workDate: "20241007",          // 有效交易日期 (String)
        orderDate: "20241007",         // 委託日期 (String)
        orderTime: "153617390",        // 委託時間 (String)
        sysCode: "4U",                 // 來源別 (String)
        orderNo: "h0001",              // 委託書號 (String)
        symbol: "2889",                // 股票代號 (String)
        buySell: "Buy",                // 買賣方向 (String)
        market: "T",                   // 市場代號 (String)
        marketType: "Common",          // 盤別 (String)
        priceType: "Limit",            // 價格類型 (String)
        timeInForce: "ROD",            // 委託條件 (String)
        orderType: "0",                // 委託類型 (String)
        orderPrice: 15.0,              // 委託價格 (Double)
        orgQty: 15000,                 // 委託數量 (Int)
        filledQty: 15000,              // 已成交數量 (Int)
        celQty: 0,                     // 已取消數量 (Int)
        canCancel: false,              // 是否可取消 (Boolean)
        errCode: "000000",             // 錯誤代號 (String)
        errMsg: "",                    // 錯誤訊息 (String)
        seqNo: null,                   // 流水號 (String)
        isPreOrder: null,              // 是否為預訂單 (Boolean)
        preOrderNo: null,              // 預訂單號碼 (String)
        avgPrice: null,                // 平均成交價格 (Double)
        chgTime: null,                 // 異動時間 (String)
        chgDate: null                  // 異動日期 (String)
    }
]
```

---

<a id="sec37"></a>
## 37 Node.js · 交易 · FilledHistory

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/trade/FilledHistory

filledHistoryDetail

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| startDate | string | 查詢開始日 ( YYYYMMDD ) |
| endDate | string | 查詢終止日 ( YYYYMMDD ) |

### 成交資訊 FilledRecordOutput 欄位

Return type : Object

| 參數 | 類型 | 說明 |
| --- | --- | --- |
| orderNo | String | 委託書號 |
| sysCode | String | 來源別 |
| symbol | String | 股票代號 |
| mktSeqNo | String | 成交序號 |
| marketType | MarketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg、 興櫃、IntradayOdd 盤中零股 |
| market | String | 市場 : T 上市、O上櫃、R興櫃 |
| buySell | BSAction | 買賣方向 : Buy 買、Sell 賣 |
| orderType | OrderType | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券、DayTradeShort 現股當沖賣 |
| payment | Double | 應收付總金額 |
| filledDate | String | 成交日期 |
| filledTime | String | 成交時間 |
| filledQty | Int | 成交股數 |
| filledPrice | Double | 成交價格 |

### 請求範例

```
const filled_history_detail = sdk.stock.filledHistoryDetail(account,"20230921","20230922");
console.log(filled_history_detail)
```

### 回傳範例

```
{
    orderNo: "g0002",                // 委託書號 (String)
    sysCode: "4U",                   // 來源別 (String)
    symbol: "2889",                  // 股票代號 (String)
    mktSeqNo: "00000009",            // 成交序號 (String)
    marketType: 1,                   // 盤別 (Int)
    market: "T",                     // 市場 (String)
    buySell: "Buy",                  // 買賣方向 (BsAction)
    orderType: "Common",             // 委託單類型 (OrderType)
    payment: 15000.0,                // 應收付總金額 (Double)
    filledDate: "20241004",          // 成交日期 (String)
    filledTime: "152549030",         // 成交時間 (String)
    filledQty: 1000,                 // 成交股數 (Int)
    filledPrice: 15.0,               // 成交價格 (Double)
}
```

---

<a id="sec38"></a>
## 38 Node.js · 交易 · FilledHistoryDetail

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/trade/FilledHistoryDetail

filledHistory

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| startDate | string | 查詢開始日 ( YYYYMMDD ) |
| endDate | string | 查詢終止日 ( YYYYMMDD ) |

### 成交資訊 FilledRecordOutput 欄位

Return type : Object

| 參數 | 類型 | 說明 |
| --- | --- | --- |
| orderNo | String | 委託書號 |
| sysCode | String | 來源別 |
| symbol | String | 股票代號 |
| mktSeqNo | String | 成交序號 |
| marketType | MarketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg、 興櫃、IntradayOdd 盤中零股 |
| market | String | 市場 : T 上市、O上櫃、R興櫃 |
| buySell | BSAction | 買賣方向 : Buy 買、Sell 賣 |
| orderType | OrderType | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券、DayTradeShort 現股當沖賣 |
| payment | Double | 應收付總金額 |
| filledDate | String | 成交日期 |
| filledTime | String | 成交時間 |
| filledQty | Int | 成交股數 |
| filledPrice | Double | 成交價格 |

### 請求範例

```
const filled_history = sdk.stock.filledHistory(account,"20230921","20230922");
console.log(filled_history)
```

### 回傳範例

```
{
    orderNo: "g0002",                // 委託書號 (String)
    sysCode: "4U",                   // 來源別 (String)
    symbol: "2889",                  // 股票代號 (String)
    mktSeqNo: "00000009",            // 成交序號 (String)
    marketType: 1,                   // 盤別 (Int)
    market: "T",                     // 市場 (String)
    buySell: "Buy",                  // 買賣方向 (BsAction)
    orderType: "Common",             // 委託單類型 (OrderType)
    payment: 15000.0,                // 應收付總金額 (Double)
    filledDate: "20241004",          // 成交日期 (String)
    filledTime: "152549030",         // 成交時間 (String)
    filledQty: 1000,                 // 成交股數 (Int)
    filledPrice: 15.0,               // 成交價格 (Double)
}
```

---

<a id="sec39"></a>
## 39 Node.js · 交易 · MarginQuota

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/trade/MarginQuota

marginQuota

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| symbol | String | 股票代碼 |
| query_type | String | 查詢類別 : 1融資、2融券 |

### 配額資訊 MarginShortQuota欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| symbol | String | 股票代號 |
| kind | String | 類別 (1: 融資, 2: 融券) |
| tqty | String | 資券限額 : 數量 、停資、停券、不限資 |
| stop | String | 是否停止融資/融券交易 (Y: 是, N: 否) |
| crPercentage | String | 融資成數 (如 :0600 表0.6) |
| dbPercentage | String | 融券成數 (如 :0900 表0.9) |
| blMark | String | 融券核准記號 |
| crStatus | String | 融資狀態 (查詢融資時才有) (如: 資0900 代表資成數) |
| dbStatus | String | 融券狀態 (查詢融券時才有) (如: 券0900 代表券成數) |
| crFlag | String | 信用交易資格: Y 無信用交易資格、N 有信用交易資格 |
| luMsg | String | 平盤下是否可券賣 |
| dteMsg | String | 是否可當沖、禁98戶 |

### 請求範例

```
sdk.stock.marginQuota(account, "2330")
```

### 回傳範例

```
{
    symbol: "2330",                      // 股票代號 (String)
    kind: "1",                           // 類別  (String)
    tqty: "不限資",                       // 資券限額 (String)
    stop: "N",                           // 是否停止融資/融券交易 (String)
    crPercentage: "0600",                // 融資成數 (String)
    dbPercentage: "0900",                // 融券成數 (String)
    blMark: "1",                         // 融券核准記號 (String)
    crStatus: null,                      // 融資狀態 (String)
    dbStatus: "券0900",                  // 融券狀態 (String)
    crFlag: "N",                         // 信用交易資格 (String)
    luMsg: "平盤下可券",                  // 平盤下可券賣 (String)
    dteMsg: "可當沖",                     // 可當沖 (String)
}
```

---

<a id="sec40"></a>
## 40 Node.js · 交易 · ShortDayTradeQuota

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/trade/ShortDayTradeQuota

shortDaytradeQuota

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |

### ShortResource 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| quota | String | 現沖券剩餘張數 |
| total | String | 現冲券原始額度 |
| used | String | 現冲券使用額度 |

### 請求範例

```
sdk.stock.shortDaytradeQuota(account, "2330")
```

### 回傳範例

```
{
    quota: "00000740",   // 現沖券剩餘張數 (String)
    total: "00000740",   // 現冲券原始額度 (String)
    used: "00000000",    // 現冲券使用額度 (String)
}
```

---

<a id="sec41"></a>
## 41 Node.js · 交易 · QueryAttentionStock

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/trade/QueryAttentionStock

queryAttentionStock

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| symbol | String ( Optional ) | 股票代號 |

### AlertStockOutput 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| marketType | Int | 市場別 : 0 上市、1上櫃、3興櫃 |
| symbol | String | 股票代號 |
| lowerLimitPrice | Double | 跌停價 |
| closingPrice | Double | 收盤價 |
| upperLimitPrice | Double | 漲停價 |
| alertStartDate | String | 警示開始日期 |
| alertEndDate | String | 警示結束日期 |
| alertHandlingMode | Int | 警示處理模式 : 1 受處置、2再處置 、 非1、2 為正常 |
| stockName | String | 股票名稱 |
| messageDescription | String | 訊息說明（風控股票提示） |
| shortSellingAtFlatMark | String | 平盤下可否券賣（1 表示可平盤下券賣、不為 1 則不可平盤下券賣） |
| shortSellingAtFlatAllowed | String | 平盤下可券賣狀態 ( 當股查詢時才有值 ) |
| dayTradingAndAccount98Status | String | 是否可當沖及禁98戶 |

### 請求範例

```
# 查詢全部
sdk.stock.queryAttentionStock(account)

# 查詢單檔
sdk.stock.queryAttentionStock(account,"9945")
```

### 回傳範例

```
{ 
    marketType: 0,                                                          // 市場別 (Int)
    symbol: "9945",                                                         // 股票代號 (String)
    lowerLimitPrice: 43.65,                                                 // 當日跌停價 (Double)
    closingPrice: 48.45,                                                    // 當日收盤價 (Double)
    upperLimitPrice: 53.20,                                                 // 當日漲停價 (Double)
    alertStartDate: "20241008",                                             // 警示開始日期 (String)
    alertEndDate: "20241011",                                               // 警示結束日期 (String)
    alertHandlingMode: 0,                                                   // 警示處理模式 (Int)
    stockName: "潤泰新",                                                     // 股票名稱 (String)
    messageDescription: "風控股票，請務必查詢是否委託成功，或洽營業員辦理！",    // 訊息說明 (String)
    shortSellingAtParMark: "1",                                              // 平盤下可否券賣 (String)
    shortSellingAtParAllowed: "平盤下可券",                                   // 平盤下可券賣狀態 (String)
    dayTradingAndAccount98Status: "禁當沖",                                  // 當沖及帳戶98狀態 (String)
}
```

---

<a id="sec42"></a>
## 42 Node.js · 交易 · QueryDispositionStock

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/trade/QueryDispositionStock

queryDispositionStock

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| symbol | String | 股票代號 |

### StockStatusOutput 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| symbol | string | 股票代號 |
| abnormalRecommendationMark | string | 異常推介註記 : 0 表示正常、1投資理財節目異常推介 |
| abnormalDescription | string | 異常說明 |
| specialAbnormalMark | string | 特殊異常註記 : 0 表示正常、1特殊異常有價證券 |
| specialAbnormalDescription | string | 特殊異常說明 |
| dispositionStockMark | string | 處置股票註記 : 0 表示正常、1 處置股票、2 再次處置、3 彈性處置 |
| dispositionDescription | string | 處置說明 |
| internalControlCategory | string | 內控類別 : 0 表示正常、AA委託超過 30 萬需預收、A 委託超過 50 萬需預收、B 委託超過 300 萬需預收、C 委託超過 500 萬需預收 |
| internalControlDescription | string | 內控類別說明 |

### 請求範例

```
sdk.stock.queryDispositionStock(account,"4956")
```

### 回傳範例

```
{
    symbol: "4956",                         // 股票代號 (String)
    abnormalRecommendationMark: "0",        // 異常推介註記 (String) : `0` 表示正常、`1`投資理財節目異常推介
    abnormalDescription: "",                // 異常說明 (String)
    specialAbnormalMark: "0",               // 特殊異常註記 (String) : `0` 表示正常、`1`特殊異常有價證券
    specialAbnormalDescription: "",         // 特殊異常說明 (String)
    dispositionStockMark: "1",              // 處置股票註記 (String) : `0` 表示正常、`1` 處置股票、`2` 再次處置、`3`彈性處置
    dispositionDescription: "處置有價證券，請注意交易風險！", // 處置股票說明 (String)
    internalControlCategory: "0",           // 內控類別 (String) : `0` 表示正常、`AA`委託超過 30 萬需預收、`A` 委託超過 50 萬需預收、`B` 委託超過 300 萬需預收、`C` 委託超過 500 萬需預收
    internalControlDescription: "",         // 內控類別說明 (String)
}
```

---

<a id="sec43"></a>
## 43 Node.js · 帳務 · AccountTotalPnL

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/accountManagement/AccountTotalPnL

accountTotalPnl

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |

### 帳戶損益速查 AccountQuickInquiryResponse 欄位

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| unrealizedProfitLossCash | String | 未實現損益（現股） |
| unrealizedProfitLossMargin | String | 未實現損益（融資） |
| unrealizedProfitLossShortSelling | String | 未實現損益（融券） |
| unrealizedProfitLossTotal | String | 未實現損益總計 |
| realizedProfitLossCash | String | 已實現損益（現股） |
| realizedProfitLossMargin | String | 已實現損益（融資） |
| realizedProfitLossShortSelling | String | 已實現損益（融券） |
| realizedProfitLossTotal | String | 已實現損益總計 |
| dayTradingProfitLossCredit | String | 當沖損益（信用） |
| dayTradingProfitLossCash | String | 當沖損益（現股） |
| netAmount | String | 淨收付金額 |
| accountMaintenanceRate | string | 整戶維持率 |
| totalProfitLossCash | String | 總損益（現股） |
| totalProfitLossMargin | String | 總損益（融資） |
| totalProfitLossShortSelling | String | 總損益（融券） |
| totalProfitLoss | String | 總損益 |

### 請求範例

```
sdk.accounting.accountTotalPnl(account)
```

### 回傳範例

```
{
    unrealizedProfitLossCash: "85293",         // 未實現損益（現股） (string)
    unrealizedProfitLossMargin: "0",           // 未實現損益（融資） (string)
    unrealizedProfitLossShortSelling: "0",     // 未實現損益（融券） (string)
    unrealizedProfitLossTotal: "85293",        // 未實現損益總計 (string)
    realizedProfitLossCash: "0",               // 已實現損益（現股） (string)
    realizedProfitLossMargin: "0",             // 已實現損益（融資） (string)
    realizedProfitLossShortSelling: "0",       // 已實現損益（融券） (string)
    realizedProfitLossTotal: "0",              // 已實現損益總計 (string)
    dayTradingProfitLossCredit: "0",           // 當沖損益（信用） (string)
    dayTradingProfitLossCash: "0",             // 當沖損益（現股） (string)
    netAmount: "-2904132",                     // 淨收付金額 (string)
    accountMaintenanceRate: null,              // 整戶維持率 (string)
    totalProfitLossCash: "85293",              // 總損益（現股） (string)
    totalProfitLossMargin: "0",                // 總損益（融資） (string)
    totalProfitLossShortSelling: "0",          // 總損益（融券） (string)
    totalProfitLoss: "85293",                  // 總損益 (string)
}
```

---

<a id="sec44"></a>
## 44 Node.js · 帳務 · Inventories

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/accountManagement/Inventories

inventories

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |

### PositionResponse 欄位

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| no | string | 序號 |
| prevDayQuantity | string | 昨日庫存股數 |
| currentQuantity | string | 即時庫存股數 |
| todayQuantity | string | 今日增減成交股數 |
| todayBuyQuantity | string | 今日買進成交數量 |
| todaySellQuantity | string | 今日賣出成交數量 |
| cost | string | 付出成本 |
| marketValue | string | 現值 |
| unrealizedProfitLoss | string | 未實現損益 |
| unrealizedProfitLossRate | string | 未實現損益率 |
| securitiesTransactionIncomeTax | string | 證券交易所得稅 |
| healthInsuranceFee | string | 健保補充費 |
| fee | string | 手續費 |
| tax | string | 交易稅 |
| openMarginAmount | string | 未償還融資/券金額 |
| openGuaranteeAmount | string | 未償還融券保證金 |
| openShortCollateral | string | 未償還擔保品 |
| shortSellingFee | string | 融券手續費 |
| ownFundsAmount | string | 自備款 |
| otherCost | string | 其他費用 ( 除手續費、交易稅外的費用項目 (資/券利息也包含在內) ) |
| interest | string | 利息 |
| unrealizedNetAmount | string | 預估淨收付 |
| totalProfitLoss | string | 總損益 |
| realizedProfitLoss | string | 當日已實現損益 |
| dividendAmount | string | 除息金額 |
| accountSummary | object | 帳戶摘要 |
| └─ marginPositionMarketValueSum | string | 融資市值加總 |
| └─ shortPositionMarketValueSum | string | 融券市值加總 |
| └─ shortCollateralSum | string | 融券擔保品加總 |
| └─ marginLimit | string | 融資限額 |
| └─ shortLimit | string | 融券限額 |
| └─ guaranteeAmountSum | string | 擔保金總和 |
| └─ marginAmountSum | string | 融資金額總和 |
| └─ shortAmountSum | string | 融券金額總和 |
| └─ accountMaintenanceRate | string | 帳戶維持率 |
| └─ settlementToday | string | 今日交割 |
| └─ settlementYesterday | string | 昨日交割 |
| └─ settlementNet | string | 淨交割金額 |
| positionSummaries | array | 持倉摘要清單 |
| └─ branchId | string | 分公司代號 |
| └─ custId | string | 帳號 |
| └─ no | string | 序號 |
| └─ symbol | string | 股票代碼 |
| └─ name | string | 用戶名 |
| └─ symbolName | string | 股票名稱 |
| └─ stockEvaluation | string | 股票評價 |
| └─ orderType | string | 交易類型 |
| └─ orderTypeName | string | 交易類型名稱 |
| └─ buySell | string | 買賣別 : Buy、Sell |
| └─ prevDayQuantity | string | 昨日庫存股數 |
| └─ currentQuantity | string | 即時庫存股數 |
| └─ totalQuantity | string | 今日交易增減成交股數 |
| └─ totalBuyQuantity | string | 今日買進成交股數 |
| └─ totalSellQuantity | string | 今日賣出成交股數 |
| └─ cost | string | 成本 |
| └─ costBeforeDividend | string | 成本 (不扣除息金額) |
| └─ averagePrice | string | 成交均價 |
| └─ openMarginAmount | string | 未償還融資金額 |
| └─ guaranteeAmount | string | 保證金 |
| └─ openGuaranteeAmount | string | 未償還融券保證金 |
| └─ shortCollateral | string | 擔保品 |
| └─ openShortCollateral | string | 未償還擔保品 |
| └─ shortSellingFee | string | 融券手續費 |
| └─ ownFundsAmount | string | 自備款 |
| └─ guaranteeDefaultAmount | string | 擔保金缺額 |
| └─ currentPrice | string | 現價 |
| └─ marketValue | string | 市值 |
| └─ unrealizedProfitLoss | string | 未實現損益 |
| └─ unrealizedProfitLossRate | string | 未實現損益率 |
| └─ fee | string | 手續費 |
| └─ tax | string | 稅金 |
| └─ interest | string | 利息 |
| └─ otherCost | string | 其他費用 ( 除手續費、交易稅外的費用項目 (資/券利息也包含在內) ) |
| └─ unrealizedNetAmount | string | 預估淨收付金額 |
| └─ targetPrice | string | 標的股票現價 |
| └─ portfolioType | string | 權證種類 :1 認購權證 |
| └─ holdingPercent | string | 持有比率 |
| └─ securitiesIncomeTax | string | 證券所得稅 |
| └─ healthInsuranceFee | string | 健保補充費 |
| └─ referencePrice | string | 參考價格 |
| └─ totalProfit | string | 總損益 |
| └─ realizedProfit | string | 當日已實現損益 |
| └─ pledgeQuantity | string | 質押數量 |
| └─ amount | string | 會總成交價金 |
| └─ averageFilledPrice | string | 平均成交價格 |
| └─ breakEvenPrice | string | 損益兩平價格 |
| └─ dividendAmount | string | 股利金額 |
| └─ positionDetails | array | 持倉明細 |
| └─ no | string | 序號 |
| └─ tDate | string | 成交日期 |
| └─ orderType | string | 交易類型 |
| └─ orderTypeName | string | 訂單類型名稱 |
| └─ buySell | string | 買賣別 : Buy、Sell |
| └─ orderNo | string | 委託書號 |
| └─ filledNo | string | 成交序號 |
| └─ filledQuantity | string | 成交數量 |
| └─ prevDayQuantity | string | 昨日庫存股數 |
| └─ filledPrice | string | 成交價格 |
| └─ filledAmount | string | 成交金額 |
| └─ currentPrice | string | 現價 |
| └─ marketValue | string | 市值 |
| └─ marginAmount | string | 融資金額 |
| └─ openMarginAmount | string | 未償還融資/券金額 |
| └─ shortCollateral | string | 融券抵押品 |
| └─ openShortCollateral | string | 未償還擔保品 |
| └─ guaranteeAmount | string | 保證金 |
| └─ openGuaranteeAmount | string | 未償還融券保證金 |
| └─ securitiesLendingFee | string | 標借費 |
| └─ shortSellingFee | string | 融券費手續費 |
| └─ fee | string | 手續費 |
| └─ tax | string | 交易稅 |
| └─ interest | string | 利息 |
| └─ cost | string | 收付金額 |
| └─ costBeforeDividend | string | 收付金額(不扣除息金額) |
| └─ changeType | string | 異動別 |
| └─ ownFundsAmount | string | 自備款 |
| └─ portfolioType | string | 權證種類 |
| └─ custId | string | 帳號 |
| └─ name | string | 名稱 |
| └─ branchId | string | 分行 ID |
| └─ otherCost | string | 其他費用 ( 除手續費、交易稅外的費用項目 (資/券利息也包含在內) ) |
| └─ isAdjustable | string | 是否可調整成本:Y開放、N不開放 |
| └─ securitiesIncomeTax | string | 證券所得稅 |
| └─ healthInsuranceFee | string | 健康保險費 |
| └─ unrealizedProfitLoss | string | 未實現損益 |
| └─ referencePrice | string | 參考價格 |
| └─ ioFlag | string | 異動代碼 |
| └─ ioName | string | 異動名稱 |
| └─ breakEvenPrice | string | 損益兩平價格 |
| └─ dividendAmount | string | 股利金額 |
| └─ guaranteeDefaultAmount | string | 擔保金缺額 |

### 請求範例

```
sdk.accounting.inventories(accounts)
```

### 回傳範例

```
{
    no: "合計",                                  // 序號 (string)
    prevDayQuantity: "26796",                    // 昨日庫存股數 (string)
    currentQuantity: "26796",                    // 即時庫存股數 (string)
    todayQuantity: "0",                          // 今日增減成交股數 (string)
    todayBuyQuantity: "0",                       // 今日買進成交數量 (string)
    todaySellQuantity: "0",                      // 今日賣出成交數量 (string)
    cost: "348817",                              // 付出成本 (string)
    marketValue: "549957",                       // 現值 (string)
    unrealizedProfitLoss: "198916",              // 未實現損益 (string)
    unrealizedProfitLossRate: "57.03%",          // 未實現損益率 (string)
    securitiesTransactionIncomeTax: "0",         // 證券交易所得稅 (string)
    healthInsuranceFee: "0",                     // 健保補充費 (string)
    fee: "489",                                  // 手續費 (string)
    tax: "0",                                    // 交易稅 (string)
    openMarginAmount: "0",                       // 未償還融資/券金額 (string)
    openGuaranteeAmount: "0",                    // 未償還融券保證金 (string)
    openShortCollateral: "0",                    // 未償還擔保品 (string)
    shortSellingFee: "0",                        // 融券手續費 (string)
    ownFundsAmount: "0",                         // 自備款 (string)
    otherCost: "0",                              // 其他費用 (string)
    interest: "0",                               // 利息 (string)
    unrealizedNetAmount: "547733",               // 預估淨收付 (string)
    totalProfitLoss: "198916.00",                // 總損益 (string)
    realizedProfitLoss: "0",                     // 當日已實現損益 (string)
    dividendAmount: "360.00",                    // 除息金額 (string)
    AccountSummary {
        marginPositionMarketValueSum: "0",       // 融資市值加總 (string)
        shortPositionMarketValueSum: "0",        // 融券市值加總 (string)
        shortCollateralSum: "0",                 // 融券擔保品加總 (string)
        marginLimit: "0",                        // 融資限額 (string)
        shortLimit: "0",                         // 融券限額 (string)
        guaranteeAmountSum: "0",                 // 擔保金總和 (string)
        marginAmountSum: "0",                    // 融資金額總和 (string)
        shortAmountSum: "0",                     // 融券金額總和 (string)
        accountMaintenanceRate: "0%",            // 帳戶維持率 (string)
        settlementToday: "0",                    // 今日交割 (string)
        settlementYesterday: "0",                // 昨日交割 (string)
        settlementNet: "0",                      // 淨交割金額 (string)
    },
    positionSummaries: [
        {
            branchId: "5920",                    // 分公司代號 (string)
            custId: "1234567",                   // 帳號 (string)
            no: "1",                             // 序號 (string)
            symbol: "00885",                     // 股票代碼 (string)
            name: "許ＯＯ",                       // 用戶名 (string)
            symbolName: "富邦越南",               // 股票名稱 (string)
            stockEvaluation: "",                 // 股票評價 (string)
            orderType: "0",                      // 交易類型 (string)
            orderTypeName: "現買",                // 交易類型名稱 (string)
            buySell: "B",                        // 買賣別 (string)
            prevDayQuantity: "1000",             // 昨日庫存股數 (string)
            currentQuantity: "1000",             // 即時庫存股數 (string)
            totalQuantity: "0",                  // 今日交易增減成交股數 (string)
            totalBuyQuantity: "0",               // 今日買進成交股數 (string)
            totalSellQuantity: "0",              // 今日賣出成交股數 (string)
            cost: "16173",                       // 成本 (string)
            costBeforeDividend: "16173.00",      // 成本 (不扣除息金額) (string)
            averagePrice: "16.17",               // 成交均價 (string)
            openMarginAmount: "0",               // 未償還融資金額 (string)
            guaranteeAmount: "0",                // 保證金 (string)
            openGuaranteeAmount: "0",            // 未償還融券保證金 (string)
            shortCollateral: "0",                // 擔保品 (string)
            openShortCollateral: "0",            // 未償還擔保品 (string)
            shortSellingFee: "0",                // 融券手續費 (string)
            ownFundsAmount: "0",                 // 自備款 (string)
            guaranteeDefaultAmount: "0",         // 擔保金缺額 (string)
            currentPrice: "11.7",                // 現價 (string)
            marketValue: "11700",                // 市值 (string)
            unrealizedProfit: null,              // 未實現損益 (null)
            unrealizedProfitLossRate: "-27.85%", // 未實現損益率 (string)
            fee: "23",                           // 手續費 (string)
            tax: "0",                            // 稅金 (string)
            interest: "0",                       // 利息 (string)
            otherCost: "0",                      // 其他成本 (string)
            unrealizedNetAmount: "11669",        // 預估淨收付金額 (string)
            targetPrice: "0",                    // 標的股票現價 (string)
            portfolioType: "",                   // 權證種類 (string)
            holdingPercent: "2.13%",             // 持有比率 (string)
            securitiesIncomeTax: "0",            // 證券所得稅 (string)
            healthInsuranceFee: "0",             // 健保補充費 (string)
            referencePrice: "0",                 // 參考價格 (string)
            totalProfit: "-4504.00",             // 總損益 (string)
            realizedProfit: "0",                 // 當日已實現損益 (string)
            pledgeQuantity: "1000",              // 質押數量 (string)
            amount: "16150.00",                  // 會總成交價金 (string)
            averageFilledPrice: "16.15",         // 平均成交價格 (string)
            breakEvenPrice: "16.22",             // 損益兩平價格 (string)
            dividendAmount: "0",                 // 股利金額 (string)
            positionDetails: [
                {
                    no: "1",                    // 序號 (string)
                    tDate: "20210419",          // 成交日期 (string)
                    orderType: "0",             // 交易類型 (string)
                    orderTypeName: "現買",       // 訂單類型名稱 (string)
                    buySell: "B",               // 買賣別 (string)
                    orderNo: "i0317",           // 委託書號 (string)
                    filledNo: "0000001",        // 成交序號 (string)
                    filledQuantity: "1000",     // 成交數量 (string)
                    prevDayQuantity: "1000",    // 昨日庫存股數 (string)
                    filledPrice: "16.15",       // 成交價格 (string)
                    filledAmount: "16150.00",   // 成交金額 (string)
                    currentPrice: "11.7",       // 現價 (string)
                    marketValue: "11700",       // 市值 (string)
                    marginAmount: "0",          // 融資金額 (string)
                    openMarginAmount: "0",      // 未償還融資/券金額 (string)
                    shortCollateral: "0",       // 融券抵押品 (string)
                    openShortCollateral: "0",   // 未償還擔保品 (string)
                    guaranteeAmount: "0",       // 保證金 (string)
                    openGuaranteeAmount: "0",   // 未償還融券保證金 (string)
                    securitiesLendingFee: "0",  // 標借費 (string)
                    shortSellingFee: "0",       // 融券費手續費 (string)
                    fee: "23",                  // 手續費 (string)
                    tax: "0",                   // 交易稅 (string)
                    interest: "0",              // 利息 (string)
                    cost: "16173",              // 收付金額 (string)
                    costBeforeDividend: "16173",// 收付金額(不扣除息金額) (string)
                    changeType: "0",            // 異動別 (string)
                    ownFundsAmount: "0",        // 自備款 (string)
                    portfolioType: "",          // 權證種類 (string)
                    custId: "1234567",    // 帳號 (string)
                    name: "許ＯＯ",              // 名稱 (string)
                    branchId: "5920",           // 分行 ID (string)
                    otherCost: "0",             // 其他成本 (string)
                    isAdjusted: null,           // 是否可調整 (null)
                    securitiesIncomeTax: "0",   // 證券所得稅 (string)
                    healthInsuranceFee: "0",    // 健康保險費 (string)
                    unrealizedProfitLoss: "-4504", // 未實現損益 (string)
                    unrealizedProfitLossRate: null, // 未實現損益率 (null)
                    referencePrice: "0",        // 參考價格 (string)
                    ioFlag: "",                 // 異動代碼 (string)
                    ioName: "",                 // 異動名稱 (string)
                    breakEvenPrice: "16.22",    // 損益兩平價格 (string)
                    dividendAmount: "0",        // 股利金額 (string)
                    guaranteeDefaultAmount: "0" // 擔保金缺額 (string)
                },
            ],
        },
        ...
    ]
}
```

---

<a id="sec45"></a>
## 45 Node.js · 帳務 · TodayTradeSummary

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/accountManagement/TodayTradeSummary

todayTradeSummary

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| symbol | String ( Optional ) | 股票代號 |

### RealtimePositionQuantityOutput 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| symbol | String | 股票代號 |
| marketType | String | 市場別 : T 上市 、 O 上櫃、 R 興櫃 |
| commonStockQuantity | String | 昨日餘額普通股股數 |
| marginStockQuantity | String | 昨日餘額融資股數 |
| shortStockQuantity | String | 昨日餘額融券股數 |
| oddLotQuantity | String | 昨日餘額零股股數 |
| realTimeDepositoryQuantity | String | 即時普通股股數 |
| realTimeMarginQuantity | String | 即時融資股數 |
| realTimeShortSellingQuantity | String | 即時融券股數 |
| realTimeOddLotQuantity | String | 即時零股股數 |
| todayDepositoryBuyOrderQuantity | String | 今日普通股委託買進股數 |
| todayMarginBuyOrderQuantity | String | 今日融資委託買進股數 |
| todayShortSellingBuyOrderQuantity | String | 今日融券委託買進股數 |
| todayOddLotBuyOrderQuantity | String | 今日零股委託買進股數 |
| todayDepositorySellOrderQuantity | String | 今日普通股委託賣出股數 |
| todayMarginSellOrderQuantity | String | 今日融資委託賣出股數 |
| todayShortSellingSellOrderQuantity | String | 今日融券委託賣出股數 |
| todayOddLotSellOrderQuantity | String | 今日零股委託賣出股數 |
| todayDepositoryBuyExecutedQuantity | String | 今日普通股買進成交股數 |
| todayMarginBuyExecutedQuantity | String | 今日融資買進成交股數 |
| todayShortSellingBuyExecutedQuantity | String | 今日融券買進成交股數 |
| todayOddLotBuyExecutedQuantity | String | 今日零股買進成交股數 |
| todayDepositorySellExecutedQuantity | String | 今日普通股賣出成交股數 |
| todayMarginSellExecutedQuantity | String | 今日融資賣出成交股數 |
| todayShortSellingSellExecutedQuantity | String | 今日融券賣出成交股數 |
| todayOddLotSellExecutedQuantity | String | 今日零股賣出成交股數 |

### 請求範例

```
sdk.accounting.todayTradeSummary(account);
```

### 回傳範例

```
{
    symbol: "1108",                                // 商品代碼 (String)
    marketType: "T",                               // 市場別 (String) : T 上市 、 O 上櫃、 R 興櫃 
    commonStockQuantity: "0",                      // 昨日餘額普通股股數 (String)
    marginStockQuantity: "0",                      // 昨日餘額融資股數 (String)
    shortSellingQuantity: "0",                     // 昨日餘額融券股數 (String)
    oddLotQuantity: "0",                           // 昨日餘額零股股數 (String)
    realTimeDepositoryQuantity: "1000",            // 即時普通股股數 (String)
    realTimeMarginQuantity: "0",                   // 即時融資股數 (String)
    realTimeShortSellingQuantity: "0",             // 即時融券股數 (String)
    realTimeOddLotQuantity: "0",                   // 即時零股股數 (String)
    todayDepositoryBuyOrderQuantity: "1000",       // 今日普通股委託買進股數 (String)
    todayMarginBuyOrderQuantity: "0",              // 今日融資委託買進股數 (String)
    todayShortSellingBuyOrderQuantity: "0",        // 今日融券委託買進股數 (String)
    todayOddLotBuyOrderQuantity: "0",              // 今日零股委託買進股數 (String)
    todayDepositorySellOrderQuantity: "0",         // 今日普通股委託賣出股數 (String)
    todayMarginSellOrderQuantity: "0",             // 今日融資委託賣出股數 (String)
    todayShortSellingSellOrderQuantity: "0",       // 今日融券委託賣出股數 (String)
    todayOddLotSellOrderQuantity: "0",             // 今日零股委託賣出股數 (String)
    todayDepositoryBuyExecutedQuantity: "1000",    // 今日普通股買進成交股數 (String)
    todayMarginBuyExecutedQuantity: "0",           // 今日融資買進成交股數 (String)
    todayShortSellingBuyExecutedQuantity: "0",     // 今日融券買進成交股數 (String)
    todayOddLotBuyExecutedQuantity: "0",           // 今日零股買進成交股數 (String)
    todayDepositorySellExecutedQuantity: "0",      // 今日普通股賣出成交股數 (String)
    todayMarginSellExecutedQuantity: "0",          // 今日融資賣出成交股數 (String)
    todayShortSellingSellExecutedQuantity: "0",    // 今日融券賣出成交股數 (String)
    todayOddLotSellExecutedQuantity: "0",          // 今日零股賣出成交股數 (String)
}
```

---

<a id="sec46"></a>
## 46 Node.js · 帳務 · RealizedPnLDetail

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/accountManagement/RealizedPnLDetail

realizedProfitAndLoses

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| start_date | string | 查詢起始日 ( YYYYMMDD ) |
| end_date | string | 查詢結束日 ( YYYYMMDD ) |

### Realized 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| no | String | 編號 |
| cost | String | 買入成本 |
| income | String | 賣出成本 |
| profitLoss | String | 損益 |
| profitLossRate | String | 損益率 |
| accumulatedCost | String | 累計成本 |
| accumulatedProfitLoss | String | 累計損益 |
| accumulatedProfitLossRate | String | 累計損益率 |
| shortSellingFee | String | 融券手續費 |
| interest | String | 利息 |
| closedMarginAmount | String | 償還融資金額 |
| dividendAmount | String | 股利金額 |
| securitiesLendingDifferentialFee | String | 券差借券費 |
| profitLossSummary | Array | 損益摘要 |
| └─ branchId | String | 分公司代號 |
| └─ custId | String | 帳號 |
| └─ name | String | 客戶姓名 |
| └─ orderType | String | 委託別 : 0 整股、1、3融資、2、4融券、 9現賣（擔保品） |
| └─ orderTypeName | String | 委託類型名稱 |
| └─ buySell | String | 買賣別 : Buy、Sell : Buy、Sell |
| └─ symbol | String | 股票代號 |
| └─ symbolName | String | 股票名稱 |
| └─ targetPrice | String | 標的現價 |
| └─ portfolioType | String | 權證種類 - |
| └─ no | String | 編號 |
| └─ tDate | String | 交易日期 |
| └─ orderNo | String | 委託序號 |
| └─ filledNo | String | 成交序號 |
| └─ closedQuantity | String | 沖銷股數 |
| └─ filledPrice | String | 成交價格 |
| └─ closedMarginAmount | String | 償還融資金額 |
| └─ closedShortCollateral | String | 償還擔保品 |
| └─ closedGuaranteeAmount | String | 償還融券保證金 |
| └─ interest | String | 利息 |
| └─ shortSellingFee | String | 借券費 |
| └─ cost | String | 成本 |
| └─ costBeforeDividend | String | 成本 (不扣除息金額) |
| └─ income | String | 賣出收入 |
| └─ profitLoss | String | 損益 |
| └─ profitLossRate | String | 損益率 |
| └─ otherCost | String | 其他費用 ( 除手續費、交易稅外的費用項目 (資/券利息也包含在內) ) |
| └─ closeType | String | 沖銷類別 ： 0現股、1融資、2融券、3信用當沖、4現股當沖、5現賣(未買回)/券差(買進) |
| └─ securitiesTransactionTax | String | 證所稅 |
| └─ healthInsurancePremium | String | 健保補充費 |
| └─ orderTypeName2 | String | 委託類別名稱 |
| └─ dividendAmount | String | 除息金額 |
| └─ securitiesLendingDifferentialFee | String | 券差借券費 |
| └─ buyDetail | Object | 買入詳情 |
| └─ filledQuantity | String | 成交數量 |
| └─ filledAmount | String | 成交金額 |
| └─ netAmount | String | 淨收付 |
| └─ marginAmount | String | 融資金額 |
| └─ guaranteeAmount | String | 保證金金額 |
| └─ shortCollateral | String | 融券擔保品 |
| └─ securitiesLendingFee | String | 標借費 |
| └─ adjustmentDate | String | 調整日期 |
| └─ orderType | String | 委託別 : 0 整股、1、3融資、2、4融券、 9現賣（擔保品） |
| └─ orderTypeName | String | 委託類型名稱 |
| └─ buySell | String | 買賣方向 |
| └─ changeType | String | 變更類型 |
| └─ isAdjusted | String | 是否開放調整成本 |
| └─ ioFlag | String | 異動代碼 |
| └─ ioName | String | 異動名稱 |
| └─ no | String | 編號 |
| └─ tDate | String | 交易日期 |
| └─ orderNo | String | 委託序號 |
| └─ filledNo | String | 成交序號 |
| └─ closedQuantity | String | 沖銷股數 |
| └─ filledPrice | String | 成交價格 |
| └─ closedMarginAmount | String | 償還融資金額 |
| └─ closedShortCollateral | String | 償還擔保品 |
| └─ closedGuaranteeAmount | String | 償還融券保證金 |
| └─ fee | String | 手續費 |
| └─ interest | String | 利息 |
| └─ tax | String | 稅金 |
| └─ shortSellingFee | String | 借券費 |
| └─ cost | String | 成本 |
| └─ costBeforeDividend | String | 成本 (不扣除息金額) |
| └─ income | String | 賣出收入 |
| └─ profitLoss | String | 損益 |
| └─ profitLossRate | String | 損益率 |
| └─ otherCost | String | 其他費用 ( 除手續費、交易稅外的費用項目 (資/券利息也包含在內) ) |
| └─ closeType | String | 沖銷類別 ： 0現股、1融資、2融券、3信用當沖、4現股當沖、5現賣(未買回)/券差(買進) |
| └─ securitiesTransactionTax | String | 證所稅 |
| └─ healthInsurancePremium | String | 健保補充費 |
| └─ orderTypeName2 | String | 委託類別 |
| └─ dividendAmount | String | 除息金額 |
| └─ securitiesLendingDifferentialFee | String | 券差借券費 |
| └─ SellDetail | Object | 賣出詳情 |
| └─ filledQuantity | String | 成交數量 |
| └─ filledAmount | String | 成交金額 |
| └─ netAmount | String | 淨收付 |
| └─ marginAmount | String | 融資金額 |
| └─ guaranteeAmount | String | 保證金金額 |
| └─ shortCollateral | String | 融券擔保品 |
| └─ securitiesLendingFee | String | 標借費 |
| └─ adjustmentDate | String | 調整日期 |
| └─ orderType | String | 委託別 : 0 整股、1、3融資、2、4融券、 9現賣（擔保品） |
| └─ orderTypeName | String | 委託類型名稱 |
| └─ buySell | String | 買賣方向 |
| └─ changeType | String | 變更類型 |
| └─ isAdjusted | String | 是否開放調整成本 |
| └─ ioFlag | String | 異動代碼 |
| └─ ioName | String | 異動名稱 |
| └─ no | String | 編號 |
| └─ tDate | String | 交易日期 |
| └─ orderNo | String | 委託序號 |
| └─ filledNo | String | 成交序號 |
| └─ closedQuantity | String | 沖銷股數 |
| └─ filledPrice | String | 成交價格 |
| └─ closedMarginAmount | String | 償還融資金額 |
| └─ closedShortCollateral | String | 償還擔保品 |
| └─ closedGuaranteeAmount | String | 償還融券保證金 |
| └─ fee | String | 手續費 |
| └─ interest | String | 利息 |
| └─ tax | String | 稅金 |
| └─ shortSellingFee | String | 借券費 |
| └─ cost | String | 成本 |
| └─ costBeforeDividend | String | 成本 (不扣除息金額) |
| └─ income | String | 賣出收入 |
| └─ profitLoss | String | 損益 |
| └─ profitLossRate | String | 損益率 |
| └─ otherCost | String | 其他費用 ( 除手續費、交易稅外的費用項目 (資/券利息也包含在內) ) |
| └─ closeType | String | 沖銷類別 ： 0現股、1融資、2融券、3信用當沖、4現股當沖、5現賣(未買回)/券差(買進) |
| └─ securitiesTransactionTax | String | 證所稅 |
| └─ healthInsurancePremium | String | 健保補充費 |
| └─ orderTypeName2 | String | 委託類別 |
| └─ dividendAmount | String | 除息金額 |
| └─ securitiesLendingDifferentialFee | String | 券差借券費 |

### 請求範例

```
sdk.accounting.realizedProfitAndLoses(account,"20241101","20241201");
```

### 回傳範例

```
{
        no: "合計", // 編號 (String)
        cost: "83618", // 買入總成本 (String)
        income: "81462", // 賣出總收入 (String)
        profitLoss: "-2156", // 總損益 (String)
        profitLossRate: "-2.58%", // 總損益率 (String)
        accumulatedCost: "0", // 累計成本 (String)
        accumulatedProfitLoss: "-2156", // 累計損益 (String)
        accumulatedProfitLossRate: "-2.58%", // 累計損益率 (String)
        shortSellingFee: "0", // 融券手續費 (String)
        interest: "0", // 利息 (String)
        closedMarginAmount: "0", // 償還融資金額 (String)
        dividendAmount: "0", // 股利金額 (String)
        securitiesLendingDifferentialFee: "0", // 券差借券費 (String)
        profitLossSummary: [
            {
                no: "1", // 編號 (String)
                transactionDate: "20240808", // 交易日期 (String)
                filledNo: "0000001", // 成交編號 (String)
                closedQuantity: "1000", // 平倉數量 (String)
                filledPrice: "81.70", // 成交價格 (String)
                closedMarginAmount: "0", // 償還融資金額 (String)
                closedShortCollateral: "0", // 償還擔保品 (String)
                closedGuaranteeAmount: "0", // 償還保證金 (String)
                interest: "0", // 利息 (String)
                shortSellingFee: "0", // 融券費用 (String)
                cost: "83618", // 買入成本 (String)
                costBeforeDividend: "83618", // 買入成本 (未扣除股息) (String)
                income: "81462", // 賣出收入 (String)
                profitLoss: "-2156", // 損益 (String)
                profitLossRate: "-2.58%", // 損益率 (String)
                otherCost: "0", // 其他成本 (String)
                closedType: "4", // 平倉類型 (String)
                orderTypeName2: "現沖", // 委託類型名稱2 (String)
                dividendAmount: "0", // 股息金額 (String)
                securitiesLendingDifferentialFee: "0", // 券差借券費 (String)
                branchId: "5920", // 分公司代號 (String)
                customerId: "9816000", // 客戶帳號 (String)
                customerName: "陳XXX", // 客戶姓名 (String)
                orderType: "0", // 委託類型 (String)
                orderTypeName: "現股", // 委託類型名稱 (String)
                buySell: "Sell", // 買賣方向 (String)
                symbol: "3663", // 股票代號 (String)
                symbolName: "鑫科", // 股票名稱 (String)
                targetPrice: "0", // 標的價格 (String)
                portfolioType: "", // 投資組合類型 (String)
                buyDetail: {
                    no: "1", // 編號 (String)
                    transactionDate: "20240808", // 交易日期 (String)
                    orderNo: "o0179", // 委託序號 (String)
                    filledNo: "0000002", // 成交編號 (String)
                    closedQuantity: "1000", // 平倉股數 (String)
                    filledPrice: "83.50", // 成交價格 (String)
                    closedMarginAmount: "0", // 償還融資金額 (String)
                    closedShortCollateral: "0", // 償還擔保品 (String)
                    closedGuaranteeAmount: "0", // 償還保證金 (String)
                    fee: "118", // 手續費 (String)
                    interest: "0", // 利息 (String)
                    tax: "0", // 稅金 (String)
                    shortSellingFee: "0", // 融券費用 (String)
                    cost: "83618", // 買入成本 (String)
                    costBeforeDividend: "83618", // 買入成本 (未扣除股息) (String)
                    income: "81462", // 賣出收入 (String)
                    profitLoss: "-2156", // 損益 (String)
                    profitLossRate: "-2.58%", // 損益率 (String)
                    otherCost: "0", // 其他成本 (String)
                    closedType: "4", // 平倉類型 (String)
                    securitiesTransactionTax: "0", // 證券交易稅 (String)
                    healthInsurancePremium: "0", // 健保費用 (String)
                    orderTypeName2: "買沖", // 委託類型名稱2 (String)
                    dividendAmount: "0", // 股息金額 (String)
                    securitiesLendingDifferentialFee: "0", // 券差借券費 (String)
                    filledQuantity: "1000", // 成交數量 (String)
                    filledAmount: "83500", // 成交金額 (String)
                    netAmount: "-83618", // 淨支付金額 (String)
                    marginAmount: "0", // 融資金額 (String)
                    guaranteeAmount: "0", // 保證金金額 (String)
                    shortCollateral: "0", // 融券擔保品 (String)
                    securitiesLendingFee: "0", // 證券借貸費用 (String)
                    adjustmentDate: "", // 調整日期 (String)
                    orderType: "0", // 委託類型 (String)
                    orderTypeName: "現股", // 委託類型名稱 (String)
                    buySell: "B", // 買賣方向 (String)
                    changeType: "0", // 變更類型 (String)
                    isAdjusted: "N", // 是否已調整 (String)
                    ioFlag: "", // 異動代碼 (String)
                    ioName: "" // 異動名稱 (String)
                },
                sellDetail: {
                    no: "1", // 編號 (String)
                    transactionDate: "20240808", // 交易日期 (String)
                    orderNo: "g0050", // 委託序號 (String)
                    filledNo: "0000001", // 成交編號 (String)
                    closedQuantity: "1000", // 平倉股數 (String)
                    filledPrice: "81.70", // 成交價格 (String)
                    closedMarginAmount: "0", // 償還融資金額 (String)
                    closedShortCollateral: "0", // 償還擔保品 (String)
                    closedGuaranteeAmount: "0", // 償還保證金 (String)
                    fee: "116", // 手續費 (String)
                    interest: "0", // 利息 (String)
                    tax: "122", // 稅金 (String)
                    shortSellingFee: "0", // 融券費用 (String)
                    cost: "0", // 成本 (String)
                    costBeforeDividend: "0", // 成本 (未扣除股息) (String)
                    income: "81462", // 賣出收入 (String)
                    profitLoss: "0", // 損益 (String)
                    profitLossRate: "100.00%", // 損益率 (String)
                    otherCost: "0", // 其他成本 (String)
                    closedType: "4", // 平倉類型 (String)
                    securitiesTransactionTax: "0", // 證券交易稅 (String)
                    healthInsurancePremium: "0", // 健保費用 (String)
                    orderTypeName2: "賣沖", // 委託類型名稱2 (String)
                    dividendAmount: "0", // 股息金額 (String)
                    securitiesLendingDifferentialFee: "0", // 券差借券費 (String)
                    filledQuantity: "1000", // 成交數量 (String)
                    filledAmount: "81700", // 成交金額 (String)
                    netAmount: "81462", // 淨收入金額 (String)
                    marginAmount: "0", // 融資金額 (String)
                    guaranteeAmount: "0", // 保證金金額 (String)
                    shortCollateral: "0", // 融券擔保品 (String)
                    securitiesLendingFee: "0", // 證券借貸費用 (String)
                    adjustmentDate: "", // 調整日期 (String)
                    orderType: "0", // 委託類型 (String)
                    orderTypeName: "現股", // 委託類型名稱 (String)
                    buySell: "S", // 買賣方向 (String)
                    changeType: "", // 變更類型 (String)
                    isAdjusted: null, // 是否已調整 (null 或 String)
                    ioFlag: "", // 異動代碼 (String)
                    ioName: "" // 異動名稱 (String)
                }
            }
        ]
    }
```

---

<a id="sec47"></a>
## 47 Node.js · 帳務 · AccountStatement

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/accountManagement/AccountStatement

accountStatement

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| start_date | String | 查詢起始日期 ( YYYYMMDD ) |
| end_date | String | 查尋迄日 ( YYYYMMDD ) |
| symbol | String ( Optional ) | 股票代號 |

### 未實現 StatementResponse 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| income | String | 賣出 |
| cost | String | 買入 |
| netAmount | String | 收付淨額 |
| fee | String | 手續費 |
| tax | String | 交易稅 |
| marginShortDayTradingProfitLoss | String | 融券當沖損益 |
| commonStockDayTradingProfitLoss | None | 普通股當沖損益 |
| securitiesIncomeTax | String | 證券所得稅 |
| healthInsuranceFee | String | 健保費 |
| filledQuantity | String | 成交股數 |
| interest | String | 利息 |
| shortSellingFee | String | 融券費 |
| filledAmount | String | 成交金額 |
| paymentGrossTotal | String | 付款總額 |
| profitLoss | String | 損益 |
| creditDebitNetAmount | String | 信用貸款淨額 |
| securitiesLendingDifferentialFee | String | 證券借貸價差費 |
| accountSummary | Object | 帳戶摘要 |
| └─ marginPositionMarketValueSum | String | 融資市值總計 |
| └─ shortPositionMarketValueSum | String | 融券市值總計 |
| └─ shortCollateralSum | String | 融券擔保品總計 |
| └─ marginLimit | String | 融資限額 |
| └─ shortLimit | String | 融券限額 |
| └─ guaranteeAmountSum | String | 保證金總計 |
| └─ marginAmountSum | String | 融資金額總計 |
| └─ shortAmountSum | String | 融券金額總計 |
| └─ accountMaintenanceRate | String | 帳戶維持率 |
| └─ settlementToday | String | 今日結算金額 |
| └─ settlementYesterday | String | 昨日結算金額 |
| └─ settlementNet | String | 結算淨額 |
| billSummary | Object | 帳單摘要 |
| └─ commonStockBuyAmount | String | 普通股買入金額 |
| └─ commonStockSellAmount | String | 普通股賣出金額 |
| └─ commonStockFee | String | 普通股手續費 |
| └─ commonStockTax | String | 普通股稅金 |
| └─ commonStockStInTax | String | 普通股證交稅 |
| └─ commonStockNetAmount | String | 普通股淨額 |
| └─ ownFundsAmount | String | 自有資金金額 |
| └─ marginAmount | String | 融資金額 |
| └─ marginFee | String | 融資手續費 |
| └─ marginInterest | String | 融資利息 |
| └─ marginTax | String | 融資稅金 |
| └─ marginSecuritiesIncomeTax | String | 融資證券所得稅 |
| └─ marginNetAmount | String | 融資淨額 |
| └─ guaranteeAmount | String | 保證金金額 |
| └─ shortCollateral | String | 融券擔保品 |
| └─ shortFee | String | 融券手續費 |
| └─ shortInterest | String | 融券利息 |
| └─ shortHealthInsuranceFee | String | 融券健保費 |
| └─ shortNetAmount | String | 融券淨額 |
| └─ profitLoss | String | 損益 |
| └─ buyQuantity | String | 買進股數 |
| └─ sellQuantity | String | 賣出股數 |
| └─ netAmount | String | 淨額 |
| └─ securitiesLendingDifferentialFee | String | 證券借貸價差費 |
| filledRecords | list | 成交資訊 |
| └─ branchId | String | 分公司代號 |
| └─ custId | String | 帳號 |
| └─ name | String | 姓名 |
| └─ symbol | String | 股票代號 |
| └─ symbolName | String | 股票名 |
| └─ filledDate | String | 成交日期 |
| └─ orderNo | String | 委託書號 |
| └─ filledNo | String | 成交序號 |
| └─ orderType | String | 委託別 |
| └─ orderTypeName | String | 委託別名稱 |
| └─ buySell | String | 買賣別 |
| └─ buySellName | String | 買賣別名稱 |
| └─ marketType | String | 盤別 |
| └─ filledPrice | String | 成交價 |
| └─ filledQty | String | 成交股數 |
| └─ filledAmount | String | 成交值 |
| └─ tax | String | 交易稅 |
| └─ fee | String | 手續費 |
| └─ interest | String | 利息 |
| └─ reverseInterest | String | 融券利息 |
| └─ marginAmount | String | 信用金額 |
| └─ shortAmount | String | 借貸金額 |
| └─ shortCollateral | String | 擔保品 |
| └─ guaranteeAmount | String | 融券保證金 |
| └─ shortSellingFee | String | 融券手續費 |
| └─ income | String | 淨收金額 |
| └─ cost | String | 淨付金額 |
| └─ securitiesLendingFee | String | 標借費 |
| └─ netAmount | String | 預估淨額 |
| └─ ownFundsAmount | String | 自備款 |
| └─ profitLoss | String | 損益 |
| └─ securitiesTransactionIncomeTax | String | 證所稅 |
| └─ healthInsuranceFee | String | 健保補充費 |
| └─ isDayTrade | String | 是否為當沖 |
| └─ securitiesLendingDifferentialFee | String | 證券借貸價差費 |

### 請求範例

```
sdk.accounting.accountStatement(account,"20241101","20241201")
```

### 回傳範例

```
{
    income: "0",                                   // 賣出 (String)
    cost: "0",                                     // 買入 (String)
    netAmount: "0",                                // 收付淨額 (String)
    fee: "0",                                      // 手續費 (String)
    tax: "0",                                      // 交易稅 (String)
    marginShortDayTradingProfitLoss: "0",          // 融券當沖損益 (String)
    commonStockDayTradingProfitLoss: null,         // 普通股當沖損益 (String)
    securitiesIncomeTax: "0",                      // 證券所得稅 (String)
    healthInsuranceFee: "0",                       // 健保費 (String)
    filledQuantity: "0",                           // 成交股數 (String)
    interest: "0",                                 // 利息 (String)
    shortSellingFee: "0",                          // 融券費 (String)
    filledAmount: "0",                             // 成交金額 (String)
    paymentGrossTotal: "0",                        // 付款總額 (String)
    profitLoss: "0",                               // 損益 (String)
    creditDebitNetAmount: "0",                     // 信用貸款淨額 (String)
    securitiesLendingDifferentialFee: "0",         // 證券借貸價差費 (String)
    accountSummary: {
        marginPositionMarketValueSum: "0",         // 融資持倉市值總計 (String)
        shortPositionMarketValueSum: "0",          // 融券持倉市值總計 (String)
        shortCollateralSum: "0",                     // 融券擔保品總計 (String)
        marginLimit: "0",                           // 融資限額 (String)
        shortLimit: "0",                            // 融券限額 (String)
        guaranteeAmountSum: "0",                   // 保證金總計 (String)
        marginAmountSum: "0",                      // 融資金額總計 (String)
        shortAmountSum: "0",                       // 融券金額總計 (String)
        accountMaintenanceRate: "",                // 帳戶維持率 (String)
        settlementToday: "0",                       // 今日結算金額 (String)
        settlementYesterday: "0",                   // 昨日結算金額 (String)
        settlementNet: "0",                         // 結算淨額 (String)
    },
    billSummary: {
        commonStockBuyAmount: "0",                  // 普通股買入金額 (String)
        commonStockSellAmount: "0",                 // 普通股賣出金額 (String)
        commonStockFee: "0",                         // 普通股手續費 (String)
        commonStockTax: "0",                         // 普通股稅金 (String)
        commonStockStInTax: "0",                     // 普通股證交稅 (String)
        commonStockNetAmount: "0",                   // 普通股淨額 (String)
        ownFundsAmount: "0",                         // 自有資金金額 (String)
        marginAmount: "0",                            // 融資金額 (String)
        marginFee: "0",                               // 融資手續費 (String)
        marginInterest: "0",                          // 融資利息 (String)
        marginTax: "0",                               // 融資稅金 (String)
        marginSecuritiesIncomeTax: "0",               // 融資證券所得稅 (String)
        marginNetAmount: "0",                         // 融資淨額 (String)
        guaranteeAmount: "0",                         // 保證金金額 (String)
        shortCollateral: "0",                         // 融券擔保品 (String)
        shortFee: "0",                                // 融券手續費 (String)
        shortInterest: "0",                           // 融券利息 (String)
        shortHealthInsuranceFee: "0",                 // 融券健保費 (String)
        shortNetAmount: "0",                           // 融券淨額 (String)
        profitLoss: "0",                               // 損益 (String)
        buyQuantity: "0",                              // 買進股數 (String)
        sellQuantity: "0",                             // 賣出股數 (String)
        netAmount: "0",                                // 淨額 (String)
        securitiesLendingDifferentialFee: "0",         // 證券借貸價差費 (String)
    },
    filledRecords: [
        {
            branchId: "592a",                      // 分公司代號 (String)
            custId: "0456125",                     // 帳號 (String)
            name: "xxx",                            // 姓名 (String)
            symbol: "3231",                         // 股票代號 (String)
            symbolName: "緯創",                    // 股票名 (String)
            filledDate: "20241119",                // 成交日期 (String)
            orderNo: "i9294",                      // 委託書號 (String)
            filledNo: "0000004",                   // 成交序號 (String)
            orderType: "0",                        // 委託別 (String)
            orderTypeName: "現買",                // 委託別名稱 (String)
            buySell: "B",                          // 買賣別 (String)
            buySellName: "買",                    // 買賣別名稱 (String)
            marketType: "0",                       // 盤別 (String)
            filledPrice: "113.5000",               // 成交價 (String)
            filledQty: "1000",                     // 成交股數 (String)
            filledAmount: "113500",                // 成交值 (String)
            tax: "0",                               // 交易稅 (String)
            fee: "161",                             // 手續費 (String)
            interest: "0",                          // 利息 (String)
            reverseInterest: "0",                  // 融券利息 (String)
            marginAmount: "0",                     // 信用金額 (String)
            shortAmount: "0",                      // 借貸金額 (String)
            shortCollateral: "0",                  // 擔保品 (String)
            guaranteeAmount: "0",                  // 融券保證金 (String)
            shortSellingFee: "0",                 // 融券手續費 (String)
            income: "0",                            // 淨收金額 (String)
            cost: "0",                              // 淨付金額 (String)
            securitiesLendingFee: "0",            // 標借費 (String)
            netAmount: "-113661",                  // 預估淨額 (String)
            ownFundsAmount: "0",                  // 自備款 (String)
            profitLoss: "0",                       // 損益 (String)
            securitiesTransactionIncomeTax: "0",  // 證所稅 (String)
            healthInsuranceFee: "0",               // 健保補充費 (String)
            isDayTrade: "N",                       // 是否為當沖 (String)
            securitiesLendingDifferentialFee: "0",  // 證券借貸價差費 (String)
        },
        ...
    ]
}
```

---

<a id="sec48"></a>
## 48 Node.js · 帳務 · QueryHistorySettlement

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/accountManagement/QueryHistorySettlement

historySettlement

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |
| startDate | string | 查詢起始日期 ( YYYYMMDD ) |
| endDate | string | 查詢結束日期 ( YYYYMMDD ) |

### 交割款 SettlementResponse 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| accountSummary | Object | 帳戶摘要 |
| └─ marginPositionMarketValueSum | String | 融資市值加總 |
| └─ shortPositionMarketValueSum | String | 融券市值加總 |
| └─ shortCollateralSum | String | 融券擔保品加總 |
| └─ marginLimit | String | 融資限額 |
| └─ shortLimit | String | 融券限額 |
| └─ guaranteeAmountSum | String | 融券保證金加總 |
| └─ marginAmountSum | String | 融資金額加總 |
| └─ shortAmountSum | String | 融券金額加總 |
| └─ settlementToday | String | 今日結算金額 |
| └─ settlementYesterday | String | 昨日結算金額 |
| └─ settlementNet | String | 結算淨額 |
| settlements | Array | 結算記錄 |
| └─ branchId | String | 分公司代號 |
| └─ custId | String | 帳號 |
| └─ sDate | String | 交割日期 |
| └─ tDate | String | 交易日期 |
| └─ netAmount | String | 淨收付金額 |

### 請求範例

```
sdk.accounting.historySettlement(account,"20241001","20241014")
```

### 回傳範例

```
{
    accountSummary: {                           // 帳戶摘要 (AccountSummary object)
        marginPositionMarketValueSum: "0",      // 融資市值加總 (string)
        shortPositionMarketValueSum: "0",       // 融券市值加總 (string)
        shortCollateralSum: "0",                // 融券擔保品加總 (string)
        marginLimit: "0",                       // 融資限額 (string)
        shortLimit: "0",                        // 融券限額 (string)
        guaranteeAmountSum: "0",                // 融券保證金加總 (string)
        marginAmountSum: "0",                   // 融資金額加總 (string)
        shortAmountSum: "0",                    // 融券金額加總 (string)
        settlementToday: "0",                   // 今日交割金額 (string)
        settlementYesterday: "0",               // 昨日交割金額 (string)
        settlementNet: "0",                     // 交割金額 (string)
    },
        settlements: [
     {
            branchId: "592a",                  // 分公司代號 (string)
            custId: "123456",                  // 帳號 (string)        
            sDate: "20241014",                 // 交割日期 (string)
            tDate: "20241009",                 // 交易日期 (string)
            netAmount: "-1640300.00"           // 淨收付金額 (string)
    }
    ]                          
}
```

---

<a id="sec49"></a>
## 49 Node.js · 帳務 · QueryTodaySettlement

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/accountManagement/QueryTodaySettlement

todaySettlement

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |

### 交割款 PaymentResponse 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| sDate | String | 交割日期 |
| tDate | String | 交易日期 |
| netAmount | String | 總淨收付金額 |
| settleSum | Object | 現金結算彙總 |
| └─ buyAmount | String | 今日現股買金額 |
| └─ sellAmount | String | 今日現股賣金額 |
| └─ fee | String | 手續費 |
| └─ tax | String | 交易稅 |
| └─ netAmount | String | 淨收付金額 |
| settleCreditSum | Object | 融資結算摘要 |
| └─ marginQuantity | String | 當日融資額度 |
| └─ marginQuantityLeft | String | 當日可用融資餘額 |
| └─ marginCollateral | String | 融資自備款 |
| └─ marginCollateralBuy | String | 融資自備款買入 |
| └─ marginCollateralSell | String | 融資自備款賣出 |
| └─ marginAmount | String | 融資金額 |
| └─ marginAmountBuy | String | 融資買入金額 |
| └─ marginAmountSell | String | 融資賣出金額 |
| └─ marginNetAmountBuy | String | 融資買入應收付金額 |
| └─ marginNetAmountSell | String | 融資賣出應收付金額 |
| └─ interest | String | 融資利息 |
| └─ fee | String | 手續費 |
| └─ tax | String | 交易稅 |
| └─ netAmount | String | 淨收付金額 |
| settleDebitSum | Object | 融券結算摘要 |
| └─ shortQuantity | String | 當日融券額度 |
| └─ shortQuantityLeft | String | 當日可用融資餘額 |
| └─ guaranteeAmount | String | 融券保證金 |
| └─ guaranteeAmountBuy | String | 融券保證金券買 |
| └─ guaranteeAmountSell | String | 融券保證金券賣 |
| └─ shortCollateral | String | 融券擔保品 |
| └─ shortCollateralBuy | String | 融券擔保品券買 |
| └─ shortCollateralSell | String | 融券擔保品券賣 |
| └─ shortNetAmountBuy | String | 融券券買應收付金額 |
| └─ shortNetAmountSell | String | 融券券賣應收付金額 |
| └─ shortSellingFee | String | 融券手續費 |
| └─ interest | String | 融券利息 |
| └─ netAmount | String | 融券淨收付金額 |

### 請求範例

```
sdk.accounting.todaySettlement(account)
```

### 回傳範例

```
{
    sDate: "20241209",                       // 交割日期 (string)
    tDate: "20241205",                       // 交易日期 (string)
    netAmount: "-150213",                    // 總淨收付金額 (string)
    settleSum: {                             // 現金結算摘要 
        buyAmount: "150000",                 // 今日現股買金額 (string)
        sellAmount: "0",                     // 今日現股賣金額 (string)
        fee: "213",                          // 手續費 (string)
        tax: "0",                            // 交易稅 (string)
        netAmount: "0",                      // 淨金額 (string)
    },
    settleCreditSum: {                       // 融資結算摘要 
        marginQuantity: "0",                 // 當日融資額度 (string)
        marginQuantityLeft: "0",             // 剩餘融資數量 (string)
        openShortCollateral: "0",            // 融資自備款 (string)
        openShortCollateralBuy: "0",         // 融資自備款買入 (string)
        openShortCollateralSell: "0",        // 融資自備款賣出 (string)
        marginAmount: "0",                   // 融資金額 (string)
        marginAmountBuy: "0",                // 融資買入金額 (string)
        marginAmountSell: "0",               // 融資賣出金額 (string)
        marginNetAmountBuy: "0",             // 融資淨買入金額 (string)
        marginNetAmountSell: "0",            // 融資淨賣出金額 (string)
        interest: "0",                       // 融資利息 (string)
        fee: "0",                            // 費用 (string)
        tax: "0",                            // 交易稅 (string)
        netAmount: "0",                      // 融資淨額 (string)
    },
    settleDebitSum: {                        // 融券結算摘要 (SettlementShortSummary object)
        shortQuantity: "0",                  // 融券數量 (string)
        shortQuantityLeft: "0",              // 當日可用融資餘額 (string)
        guaranteeAmount: "0",                // 保證金金額 (string)
        guaranteeAmountBuy: "0",             // 融券保證金券買 (string)
        guaranteeAmountSell: "0",            // 融券保證金券賣 (string)
        shortCollateral: "0",                // 融券擔保品 (string)
        shortCollateralBuy: "0",             // 融券擔保品券買 (string)
        shortCollateralSell: "0",            // 融券擔保品券賣 (string)
        shortNetAmountBuy: "0",              // 融券券買應收付金額 (string)
        shortNetAmountSell: "0",             // 融券券賣應收付金額 (string)
        shortSellingFee: "0",                // 融券手續費 (string)
        interest: "0",                       // 融券利息 (string)
        netAmount: "0",                      // 融券淨收付金額 (string)
    }
}
```

---

<a id="sec50"></a>
## 50 Node.js · 帳務 · Balance

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/accountManagement/Balance

> **注意：**
> 如是約定新光銀交割，請用 [新光銀餘額查詢](https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/accountManagement/SkBankBalance)

bankBalance

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |

### 餘額 Bankbalace 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| availableBalance | number | 可用餘額 |
| reservedAmount | number | 圈存金額 |
| dedicatedAccountBalance | number | 專戶餘額 |
| withdrawalBankCode | string | 出金銀行代號 |
| withdrawalBank | string | 出金銀行名稱 |
| withdrawalAccount | string | 出金銀行帳號 |
| depositBankCode | string | 入金銀行代號 |
| depositAccount | string | 入金銀行帳號 |

### 請求範例

```
sdk.accounting.bankBalance(accounts[0])
```

### 回傳範例

```
{
        availableBalance: 7015.00,              // 可用餘額 (number)
        reservedAmount: 2041.00,                // 圈存金額 (number)
        dedicatedAccountBalance: 9056.00,       // 專戶餘額 (number)
        withdrawalBankCode: "803",              // 出金銀行代號 (string)
        withdrawalBank: "聯邦",                 // 出金銀行名稱 (string)
        withdrawalAccount: "046508006075",     // 出金銀行帳號 (string)
        depositBankCode: "1030851",            // 入金銀行代號 (string)
        depositAccount: "89600221676687"       // 入金銀行帳號 (string)
}
```

---

<a id="sec51"></a>
## 51 Node.js · 帳務 · SKBankBalance

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/accountManagement/SKBankBalance

> **注意：**
> 如是約定分戶帳交割，請用 [分戶帳餘額查詢](https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/accountManagement/Balance)

skbankBalance

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |

### 餘額 SKBankbalace 欄位

Return type : Object

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| balance | number | 帳戶餘額 |
| availableBalance | number | 可用餘額 |
| currency | string | 幣別 |
| branchId | string | 分公司 |
| custId | string | 帳號 |
| bankAccount | string | 銀行帳號 |

### 請求範例

```
sdk.accounting.skbankBalance(accounts[0])
```

### 回傳範例

```
{
        balance: 7015.00,                       // 帳戶餘額 (double)
        available: 7015.00,                     // 可用餘額 (double)
        currency: "TWD",                        // 幣別 (string)
        branch_id: "592W",                      // 分公司代號 (string)
        cust_id: "1222344",                     // 證券帳號 (string)
        bank_account: "046508006075"            // 銀行帳號 (string)

}
```

---

<a id="sec52"></a>
## 52 Node.js · 取得交易日

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/GetMarketTime

getMarketTime

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| date | String | 查詢日期 |

### TradingSchedule 回傳

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| regular | Object | 正常交易時段 |
| └─ openTime | String | 正常交易開始時間（"0930"） |
| └─ closeTime | String | 正常交易結束時間（"1800"） |
| after_market | Object | 盤後交易時段 |
| └─ openTime | String | 盤後交易開始時間（"1400"） |
| └─ closeTime | String | 盤後交易結束時間（"1600"） |
| odd_lot | Object | 零股交易時段 |
| └─ openTime | String | 零股交易開始時間（"1400"） |
| └─ closeTime | String | 零股交易結束時間（"1600"） |
| intraday_odd_lot | Object | 零股當日盤交易時段 |
| └─ openTime | String | 零股當日盤交易開始時間（"0930"） |
| └─ closeTime | String | 零股當日盤交易結束時間（"1800"） |
| emg | Object | 興櫃交易時段 |
| └─ openTime | String | 興櫃交易開始時間（"1100"） |
| └─ closeTime | String | 興櫃交易結束時間（"1900"） |
| isTradingDay | Boolean | 是否為交易日（true/false） |
| lastTradingDay | String | 上一個交易日（"20240916"） |
| nextTradingDay | String | 下一個交易日（"20240919"） |
| nextTradingDay2 | String | 下下個交易日（"20240920"） |

### Request Example

```
sdk.getMarketTime("20241008")
```

### Response Example

```
{
    Regular: {   
        openTime: "0930",   // 正常交易開始時間 (String)
        closeTime: "1800",  // 正常交易結束時間 (String)
    },
    afterMarket: {   
        openTime: "1400",   // 盤後交易開始時間 (String)
        closeTime: "1600",  // 盤後交易結束時間 (String)
    },
    oddLot: {   
        openTime: "1400",   // 零股交易開始時間 (String)
        closeTime: "1600",  // 零股交易結束時間 (String)
    },
    intradayOddLot:  {   
        openTime: "0930",   // 零股當日盤交易開始時間 (String)
        closeTime: "1800",  // 零股當日盤交易結束時間 (String)
    },
    emg:  {   
        openTime: "1100",   // 興櫃交易開始時間 (String)
        closeTime: "1900",  // 興櫃交易結束時間 (String)
    },
    isTradingDay: true,   // 是否為交易日 (Boolean)
    lastTradingDay: "20241007",   // 上一個交易日 (String)
    nextTradingDay: "20241009",   // 下一個交易日 (String)
    nextTradingDay2: "20241011",  // 下下個交易日 (String)
}
```

---

<a id="sec53"></a>
## 53 Node.js · 參數對照表

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/EnumMatrix

### 類別

Class

#### OrderObject

| Parameter | Type | Meaning |
| --- | --- | --- |
| buySell | BSAction | 買賣別 : Buy、Sell |
| symbol | string | 股票代號 |
| price | string | 委託價格 |
| quantity | int | 委託數量 |
| marketType | MarketType | 盤別 : 可選用參數Common 整股、Fixing定盤、IntradayOdd 盤中零股、Odd 盤後零股、Emg 興櫃 |
| priceType | PriceType | 價格旗標 : 可選用參數為 Limit限價、LimitUp漲停、LimitDown跌停、Market市價、Reference參考價 |
| timeInForce | timeInForce | 委託條件 : 可選用參數為 ROD、FOK、IOC |
| orderType | OrderType | 委託類別 : 可選用參數為 Stock現股、Margin融資、Short融券、DayTradeShort 現股當沖（for 現沖先賣） |

> **注意：**
> 不同 MarketType 對應的 quantity 之單位及範圍不同，請參考 [盤別](#markettype) 說明。

> **注意：**
> 當 MarketType 爲 MarketType.Common, MarketType.Odd,  MarketType.IntradayOdd 其中之一，且 priceType 爲 PriceType.Limit 時，需填入 price 欄位，其餘時候 price 欄位為空值或為null。

> **注意：**
> 現沖先賣時 , orderType = DayTradeShort , buySell 需為 Sell , marketType 需為 Common

#### OrderRecord

委託列表，透過 [GetOrderResult(accounts)](https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/trade/GetOrderResults) 取得。

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| workDate | String | 有效交易日期 |
| orderDate | String | 委託日期 |
| orderTime | String | 委託時間 |
| sysCode | String | 來源別 |
| orderNo | String | 委託書號 |
| symbol | String | 股票代號 |
| buySell | BSAction | 買賣方向 :Buy 買、Sell 賣 |
| market | String | 市場 :T上市、O上櫃、R興櫃 |
| marketType | marketType | 市場類型 :Common 整股、AfterMarket 盤後 、Odd 盤後零股、Emg 興櫃、IntradayOdd 盤中零股 |
| priceType | PriceType | 價格類型 : Limit 限價、Market 市價、LimitUp 漲停價 、 LimitDown 跌停價、Reference 平盤價 |
| timeInForce | TimeInForce | 委託條件別 : ROD 、 IOC 、 FOK |
| orderType | OrderType | 委託單類型 : Stock 股票 、 Margin 融資、 Short 融券、DayTradeShort 現沖賣 |
| orderPrice | Number | 委託價格 |
| orgQty | Number | 原始下單股數 |
| filledQty | Number | 已成交股數 |
| celQty | Number | 已取消股數 |
| canCancel | Boolean | 是否可取消 : true 可取消、false不可取消 |
| errCode | String | 錯誤代碼 |
| errMsg | String | 錯誤訊息 |
| seqNo | String | 流水號 |
| isPreOrder | Boolean | 是否預約單 : true 是預約單、false不是預約單 : true 是預約單、false不是預約單 : true 是預約單、false不是預約單 : true 是預約單、false不是預約單 : true 是預約單、false不是預約單 |
| preOrderNo | String | 預約單號碼 |
| avgPrice | Number | 成交均價 |
| chgTime | String | 變動時間 |
| chgDate | String | 變動日期 |

#### Ack Object

委託回報物件

| 参数 | 类别 | 说明 |
| --- | --- | --- |
| workDate | String | 有效交易日期 |
| orderDateTime | String | 原始委託日期 |
| orgRequestNo | String | 原始委託 Request 序號 |
| sysCode | String | 來源別 |
| orgSysCode | String | 原始委託來源 |
| requestNo | String | 刪改委託 Request 序號 |
| orderNo | String | 委託書號 |
| symbol | String | 股票代號 |
| buySell | BSAction | 買賣方向 : Buy 買、Sell 賣 |
| marketType | MarketType | 市場類型 : Common 整股、AfterMarket 盤後、Odd 盤後零股、Emg 興櫃、IntradayOdd 盤中零股 |
| priceType | PriceType | 價格類型 : Limit 限價、Market 市價、LimitUp 漲停價 、 LimitDown 跌停價、Reference 平盤價 |
| timeInForce | TimeInForce | 委託條件別 : ROD、IOC、FOK |
| orderType | OrderType | 委託單類型 : Stock 股票、Margin 融資、Short 融券、ShortSale 借券 |
| orderPrice | Double | 委託價格 |
| orgQty | Int | 原始下單股數 |
| filledQty | Int | 已成交股數 |
| celQty | Int | 已取消股數 |
| canCancel | Boolean | 是否可取消 : true 可取消、false不可取消 |
| errCode | String | 錯誤代碼 |
| errMsg | String | 錯誤訊息 |
| act | String | 新單 / 刪改 : 0 新單、M 改量、C 刪單、R 改價 |
| kind | String | 種類 : ACK 委託、MAT 成交 |
| account | String | 帳號 |
| beforeQty | Int | 變更前股數 |
| afterQty | Int | 變更後股數 |
| lineNo | String | 行號 |
| orderSeqNo | String | 流水號 |
| isPreOrder | Boolean | 是否預約單 : true 是預約單、false不是預約單 |
| orgPreOrderNo | String | 原始預約單委託書編號 |
| preOrderNo | String | 預約單號碼 |

#### Mat Object

成交回報物件

| 参数 | 类别 | 说明 |
| --- | --- | --- |
| orderNo | String | 委託書號 |
| orgSysCode | String | 原始委託來源別 |
| symbol | String | 股票代號 |
| orderSeqNo | String | 網單序號 |
| mktSeqNo | String | 成交序號 |
| marketType | MarketType | 市場類型 : Common 整股、AfterMarket 盤後、Odd 盤後零股、Emg 興櫃、IntradayOdd 盤中零股 |
| buySell | BsAction | 買賣方向 : Buy 買、Sell 賣 |
| orderType | OrderType | 委託單類型 : Stock 股票、Margin 融資、Short 融券 |
| payPrice | Int | 價金 |
| lineNo | String | 行號 |
| kind | String | 種類 : MAT 成交、ACK 委託 |
| account | String | 帳號 |
| filledTime | String | 成交時間 |
| filledQty | Int | 成交股數 |
| filledPrice | Double | 成交價格 |

#### Account

帳號資訊

| Parameter | Type | Meaning |
| --- | --- | --- |
| account | string | 分公司+帳號 |
| accountType | string | 帳號類型 |
| sMark | string | 現股當沖狀態 : B 可先賣後買與先買後賣、 Y、A 可先買後賣、其餘回傳未符合資格 |
| name | string | 姓名 |

### Constants ( 欄位對應數值 )

#### BSAction

買賣別 (buySell)

| Name | Meaning |
| --- | --- |
| Buy | 買 |
| Sell | 賣 |

#### MarketType

盤別

| Name | Meaning |
| --- | --- |
| Common | 整股 |
| Fixing | 定盤 |
| IntradayOdd | 盤中零股 |
| Odd | 盤後零股 |
| Emg | 興櫃 |
| EmgOdd | 興櫃零股 |

使用不同MarketType時，相對應的Quantity所代表的單位及範圍也會不同，詳如下表:

| Name | Quantity Unit | Quantity Ranges |
| --- | --- | --- |
| Common | 千股 | 1000 ~ 499000 |
| Fixing | 千股 | 1000 ~ 499000 |
| IntradayOdd | 股 | 1 ~ 999 |
| Odd | 股 | 1 ~ 999 |
| Emg | 千股 | 1000 ~ 499000 |
| EmgOdd | 股 | 1 ~ 999 |

使用不同 MarketType 時，可使用的 PriceType , TimeInForce 會不同，詳如下表：

| MarketType | Available PriceType | Available TimeInForce |
| --- | --- | --- |
| Common | Limit 、 LimitUp 、 LimitDown 、 Market 、 Reference | ROD 、 IOC 、 FOK |
| Fixing | Reference | ROD |
| IntradayOdd | Limit 、 LimitUp 、 LimitDown 、 Reference | ROD |
| Odd | Limit 、 LimitUp 、 LimitDown 、 Reference | ROD |
| Emg | Limit | ROD |
| EmgOdd | Limit | ROD |

#### PriceType

價格類型 (priceType)

| Name | Meaning |
| --- | --- |
| Limit | 限價 |
| LimitUp | 漲停 |
| LimitDown | 跌停 |
| Market | 市價 |
| Reference | 參考價 (定盤時為定盤價) |

#### TimeInForce

委託條件 (TimeInForce)

| Name | Meaning |
| --- | --- |
| ROD | 當日有效(Rest of Day) |
| FOK | 全部成交否則取消(Fill-or-Kill) |
| IOC | 立即成交否則取消(Immediate-or-Cancel) |

#### OrderType

委託類別 (orderType)

| Name | Meaning |
| --- | --- |
| Stock | 現股 |
| Margin | 融資 |
| Short | 融券 |
| DayTradeShort | 現股當沖 |

#### market

市場

| Name | Value |
| --- | --- |
| 上市股票 | T |
| 上櫃股票 | O |
| 興櫃股票 | R |

#### QueryType

查詢類別 (QueryType)

| Name | Meaning |
| --- | --- |
| All | 全部 |
| Reservation | 預約單 |
| RegularSession | 盤中 |
| Cancelable | 可取消委託 |
| Failed | 失敗單 |

---

<a id="sec54"></a>
## 54 Node.js · API 資格開通

來源：https://ml-fugle-api.tssco.com.tw/FugleSDK/docs/trading/library/nodejs/RegisterApi

registerApiAuth

### 輸入參數

| 參數 | 類別 | 說明 |
| --- | --- | --- |
| account | Account | 帳號 |

### 回傳

Return type: bool

### 請求範例

```
const { TaishinSDK, BSAction, TimeInForce, OrderType, PriceType, MarketType } = require('taishin-sdk');

const sdk = new TaishinSDK();

const accounts = sdk.login("您的身分證字號", "您的登入密碼", "您的憑證位置", "您的憑證密碼");

console.log(accounts) //若有多帳號，則回傳多個

const register = sdk.registerApiAuth(accounts[0]) // 放入已簽屬完成的帳號
```

### 回傳範例

```
true
```

---
