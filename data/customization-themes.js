// 行程定制细分偏好。提交时仍写入 form.themes，保持现有 leads API 契约不变。
const themes = {
  'zh-CN': [
    { key: 'heritage', label: '历史文明', options: ['知名遗址古迹', '历史博物馆', '千年古风老城'] },
    { key: 'islands', label: '海滩海岛', options: ['浪漫海滩小城', '知名度假海岛', '知名海滩游泳', '温泉湖游泳', '环海一日游'] },
    { key: 'dining', label: '各类演出餐厅偏好', options: ['音乐会等演出', '山顶夜景餐厅', '卫城夜景餐厅', '传统演艺餐厅', '海湾浪漫餐厅', '湖畔露天餐厅', '米其林餐厅'] },
    { key: 'occasions', label: '特别安排', options: ['生日 / 纪念日', '求婚仪式', '浪漫婚礼', '其他仪式'] },
    { key: 'sports', label: '体育活动', options: ['红土网球', '高尔夫', '亲子活动', '海峡蹦极', '登山览景', '徒步探险', '高山滑雪', '健身房'] },
    { key: 'luxury', label: '高端私旅', options: ['包高级游艇', '包豪华游艇', '包超级游艇', '包私人飞机'] },
    { key: 'business', label: '商务服务', options: ['投资考察', '合作对接', '会务策划'] },
    { key: 'driver', label: '司导服务', options: ['全程包车服务', '只需专业讲解'] },
    { key: 'interpreting', label: '翻译服务', options: ['英语翻译', '希腊语或其他语种'] }
  ],
  'zh-TW': [
    { key: 'heritage', label: '歷史文明', options: ['知名遺址古蹟', '歷史博物館', '千年古風老城'] },
    { key: 'islands', label: '海灘海島', options: ['浪漫海灘小城', '知名度假海島', '知名海灘游泳', '溫泉湖游泳', '環海一日遊'] },
    { key: 'dining', label: '各類演出餐廳偏好', options: ['音樂會等演出', '山頂夜景餐廳', '衛城夜景餐廳', '傳統演藝餐廳', '海灣浪漫餐廳', '湖畔露天餐廳', '米其林餐廳'] },
    { key: 'occasions', label: '特別安排', options: ['生日 / 紀念日', '求婚儀式', '浪漫婚禮', '其他儀式'] },
    { key: 'sports', label: '體育活動', options: ['紅土網球', '高爾夫', '親子活動', '海峽蹦極', '登山覽景', '徒步探險', '高山滑雪', '健身房'] },
    { key: 'luxury', label: '高端私旅', options: ['包高級遊艇', '包豪華遊艇', '包超級遊艇', '包私人飛機'] },
    { key: 'business', label: '商務服務', options: ['投資考察', '合作對接', '會務策劃'] },
    { key: 'driver', label: '司導服務', options: ['全程包車服務', '只需專業講解'] },
    { key: 'interpreting', label: '翻譯服務', options: ['英語翻譯', '希臘語或其他語種'] }
  ],
  en: [
    { key: 'heritage', label: 'History & heritage', options: ['Major sites & ruins', 'History museums', 'Historic old towns'] },
    { key: 'islands', label: 'Beaches & islands', options: ['Romantic coastal towns', 'Holiday islands', 'Beach swimming', 'Thermal lake swimming', 'Coastal day cruise'] },
    { key: 'dining', label: 'Dining preferences', options: ['Concerts & performances', 'Hilltop night-view dining', 'Acropolis-view dining', 'Traditional dinner shows', 'Romantic bay dining', 'Lakeside outdoor dining', 'Michelin restaurants'] },
    { key: 'occasions', label: 'Special arrangements', options: ['Birthday / anniversary', 'Proposal', 'Intimate wedding', 'Other ceremonies'] },
    { key: 'sports', label: 'Sports & activities', options: ['Clay-court tennis', 'Golf', 'Family activities', 'Corinth Canal bungee', 'Scenic hiking', 'Trekking', 'Skiing', 'Gym'] },
    { key: 'luxury', label: 'Luxury travel', options: ['Premium yacht', 'Luxury yacht', 'Superyacht', 'Private jet'] },
    { key: 'business', label: 'Business support', options: ['Investment visit', 'Partner meetings', 'Event planning'] },
    { key: 'driver', label: 'Driver-guide service', options: ['Private car throughout', 'Professional guiding'] },
    { key: 'interpreting', label: 'Interpreting', options: ['English', 'Greek or other languages'] }
  ]
};

function getThemeCategories(locale) {
  return themes[locale] || themes['zh-CN'];
}

module.exports = { getThemeCategories };
