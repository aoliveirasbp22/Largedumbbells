'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { handleTagChange } from '@/lib/enrollments'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BRAND, FONT_BODY, FONT_DISPLAY,
  TAG_COLORS,
  Eyebrow, DisplayHeading, PageBackground, PageHeader, BrandButton,
  CornerBracket, GoldRule,
  formatPhone, phoneHref,
  useIsMobile,
} from '@/lib/brand'
import { useDialer } from '@/components/Dialer'

// ─── Country codes ─────────────────────────────────────────────────────
const COUNTRY_CODES = {
  AF:'Afghanistan',AL:'Albania',DZ:'Algeria',AD:'Andorra',AO:'Angola',AG:'Antigua and Barbuda',
  AR:'Argentina',AM:'Armenia',AU:'Australia',AT:'Austria',AZ:'Azerbaijan',BS:'Bahamas',
  BH:'Bahrain',BD:'Bangladesh',BB:'Barbados',BY:'Belarus',BE:'Belgium',BZ:'Belize',
  BJ:'Benin',BT:'Bhutan',BO:'Bolivia',BA:'Bosnia and Herzegovina',BW:'Botswana',BR:'Brazil',
  BN:'Brunei',BG:'Bulgaria',BF:'Burkina Faso',BI:'Burundi',CV:'Cape Verde',KH:'Cambodia',
  CM:'Cameroon',CA:'Canada',CF:'Central African Republic',TD:'Chad',CL:'Chile',CN:'China',
  CO:'Colombia',KM:'Comoros',CG:'Congo',CR:'Costa Rica',HR:'Croatia',CU:'Cuba',CY:'Cyprus',
  CZ:'Czech Republic',DK:'Denmark',DJ:'Djibouti',DM:'Dominica',DO:'Dominican Republic',
  EC:'Ecuador',EG:'Egypt',SV:'El Salvador',GQ:'Equatorial Guinea',ER:'Eritrea',EE:'Estonia',
  SZ:'Eswatini',ET:'Ethiopia',FJ:'Fiji',FI:'Finland',FR:'France',GA:'Gabon',GM:'Gambia',
  GE:'Georgia',DE:'Germany',GH:'Ghana',GR:'Greece',GD:'Grenada',GT:'Guatemala',GN:'Guinea',
  GW:'Guinea-Bissau',GY:'Guyana',HT:'Haiti',HN:'Honduras',HU:'Hungary',IS:'Iceland',
  IN:'India',ID:'Indonesia',IR:'Iran',IQ:'Iraq',IE:'Ireland',IL:'Israel',IT:'Italy',
  JM:'Jamaica',JP:'Japan',JO:'Jordan',KZ:'Kazakhstan',KE:'Kenya',KI:'Kiribati',KW:'Kuwait',
  KG:'Kyrgyzstan',LA:'Laos',LV:'Latvia',LB:'Lebanon',LS:'Lesotho',LR:'Liberia',LY:'Libya',
  LI:'Liechtenstein',LT:'Lithuania',LU:'Luxembourg',MG:'Madagascar',MW:'Malawi',MY:'Malaysia',
  MV:'Maldives',ML:'Mali',MT:'Malta',MH:'Marshall Islands',MR:'Mauritania',MU:'Mauritius',
  MX:'Mexico',FM:'Micronesia',MD:'Moldova',MC:'Monaco',MN:'Mongolia',ME:'Montenegro',
  MA:'Morocco',MZ:'Mozambique',MM:'Myanmar',NA:'Namibia',NR:'Nauru',NP:'Nepal',
  NL:'Netherlands',NZ:'New Zealand',NI:'Nicaragua',NE:'Niger',NG:'Nigeria',NO:'Norway',
  OM:'Oman',PK:'Pakistan',PW:'Palau',PA:'Panama',PG:'Papua New Guinea',PY:'Paraguay',
  PE:'Peru',PH:'Philippines',PL:'Poland',PT:'Portugal',QA:'Qatar',RO:'Romania',RU:'Russia',
  RW:'Rwanda',KN:'Saint Kitts and Nevis',LC:'Saint Lucia',VC:'Saint Vincent and the Grenadines',
  WS:'Samoa',SM:'San Marino',ST:'Sao Tome and Principe',SA:'Saudi Arabia',SN:'Senegal',
  RS:'Serbia',SC:'Seychelles',SL:'Sierra Leone',SG:'Singapore',SK:'Slovakia',SI:'Slovenia',
  SB:'Solomon Islands',SO:'Somalia',ZA:'South Africa',SS:'South Sudan',ES:'Spain',LK:'Sri Lanka',
  SD:'Sudan',SR:'Suriname',SE:'Sweden',CH:'Switzerland',SY:'Syria',TW:'Taiwan',TJ:'Tajikistan',
  TZ:'Tanzania',TH:'Thailand',TL:'Timor-Leste',TG:'Togo',TO:'Tonga',TT:'Trinidad and Tobago',
  TN:'Tunisia',TR:'Turkey',TM:'Turkmenistan',TV:'Tuvalu',UG:'Uganda',UA:'Ukraine',
  AE:'United Arab Emirates',GB:'United Kingdom',US:'United States',UY:'Uruguay',UZ:'Uzbekistan',
  VU:'Vanuatu',VE:'Venezuela',VN:'Vietnam',YE:'Yemen',ZM:'Zambia',ZW:'Zimbabwe'
}

// ─── Timezone helpers ──────────────────────────────────────────────────
const COUNTRY_TIMEZONES = {
  '1876': 'America/Jamaica','1868': 'America/Port_of_Spain','1246': 'America/Barbados',
  '1242': 'America/Nassau','1264': 'America/Anguilla','1268': 'America/Antigua',
  '1284': 'America/Tortola','1340': 'America/St_Thomas','1345': 'America/Cayman',
  '1441': 'America/Bermuda','1473': 'America/Grenada','1649': 'America/Grand_Turk',
  '1664': 'America/Montserrat','1721': 'America/Lower_Princes','1758': 'America/St_Lucia',
  '1767': 'America/Dominica','1784': 'America/St_Vincent','1787': 'America/Puerto_Rico',
  '1809': 'America/Santo_Domingo','1829': 'America/Santo_Domingo','1849': 'America/Santo_Domingo',
  '1869': 'America/St_Kitts','1670': 'Pacific/Saipan','1671': 'Pacific/Guam',
  '213': 'Africa/Algiers','216': 'Africa/Tunis','218': 'Africa/Tripoli','220': 'Africa/Banjul',
  '221': 'Africa/Dakar','222': 'Africa/Nouakchott','223': 'Africa/Bamako','224': 'Africa/Conakry',
  '225': 'Africa/Abidjan','226': 'Africa/Ouagadougou','227': 'Africa/Niamey','228': 'Africa/Lome',
  '229': 'Africa/Porto-Novo','230': 'Indian/Mauritius','231': 'Africa/Monrovia','232': 'Africa/Freetown',
  '233': 'Africa/Accra','234': 'Africa/Lagos','235': 'Africa/Ndjamena','236': 'Africa/Bangui',
  '237': 'Africa/Douala','238': 'Atlantic/Cape_Verde','239': 'Africa/Sao_Tome','240': 'Africa/Malabo',
  '241': 'Africa/Libreville','242': 'Africa/Brazzaville','243': 'Africa/Kinshasa','244': 'Africa/Luanda',
  '245': 'Africa/Bissau','246': 'Indian/Chagos','247': 'Atlantic/St_Helena','248': 'Indian/Mahe',
  '249': 'Africa/Khartoum','250': 'Africa/Kigali','251': 'Africa/Addis_Ababa','252': 'Africa/Mogadishu',
  '253': 'Africa/Djibouti','254': 'Africa/Nairobi','255': 'Africa/Dar_es_Salaam','256': 'Africa/Kampala',
  '257': 'Africa/Bujumbura','258': 'Africa/Maputo','260': 'Africa/Lusaka','261': 'Indian/Antananarivo',
  '262': 'Indian/Reunion','263': 'Africa/Harare','264': 'Africa/Windhoek','265': 'Africa/Blantyre',
  '266': 'Africa/Maseru','267': 'Africa/Gaborone','268': 'Africa/Mbabane','269': 'Indian/Comoro',
  '290': 'Atlantic/St_Helena','291': 'Africa/Asmara','297': 'America/Aruba','298': 'Atlantic/Faroe',
  '299': 'America/Godthab','350': 'Europe/Gibraltar','351': 'Europe/Lisbon','352': 'Europe/Luxembourg',
  '353': 'Europe/Dublin','354': 'Atlantic/Reykjavik','355': 'Europe/Tirane','356': 'Europe/Malta',
  '357': 'Asia/Nicosia','358': 'Europe/Helsinki','359': 'Europe/Sofia','370': 'Europe/Vilnius',
  '371': 'Europe/Riga','372': 'Europe/Tallinn','373': 'Europe/Chisinau','374': 'Asia/Yerevan',
  '375': 'Europe/Minsk','376': 'Europe/Andorra','377': 'Europe/Monaco','378': 'Europe/San_Marino',
  '380': 'Europe/Kiev','381': 'Europe/Belgrade','382': 'Europe/Podgorica','385': 'Europe/Zagreb',
  '386': 'Europe/Ljubljana','387': 'Europe/Sarajevo','389': 'Europe/Skopje','420': 'Europe/Prague',
  '421': 'Europe/Bratislava','423': 'Europe/Vaduz','500': 'Atlantic/Stanley','501': 'America/Belize',
  '502': 'America/Guatemala','503': 'America/El_Salvador','504': 'America/Tegucigalpa','505': 'America/Managua',
  '506': 'America/Costa_Rica','507': 'America/Panama','508': 'America/Miquelon','509': 'America/Port-au-Prince',
  '590': 'America/Guadeloupe','591': 'America/La_Paz','592': 'America/Guyana','593': 'America/Guayaquil',
  '594': 'America/Cayenne','595': 'America/Asuncion','596': 'America/Martinique','597': 'America/Paramaribo',
  '598': 'America/Montevideo','599': 'America/Curacao','670': 'Asia/Dili','672': 'Antarctica/South_Pole',
  '673': 'Asia/Brunei','674': 'Pacific/Nauru','675': 'Pacific/Port_Moresby','676': 'Pacific/Tongatapu',
  '677': 'Pacific/Guadalcanal','678': 'Pacific/Efate','679': 'Pacific/Fiji','680': 'Pacific/Palau',
  '681': 'Pacific/Wallis','682': 'Pacific/Rarotonga','683': 'Pacific/Niue','685': 'Pacific/Apia',
  '686': 'Pacific/Tarawa','687': 'Pacific/Noumea','688': 'Pacific/Funafuti','689': 'Pacific/Tahiti',
  '690': 'Pacific/Fakaofo','691': 'Pacific/Pohnpei','692': 'Pacific/Majuro','850': 'Asia/Pyongyang',
  '852': 'Asia/Hong_Kong','853': 'Asia/Macau','855': 'Asia/Phnom_Penh','856': 'Asia/Vientiane',
  '880': 'Asia/Dhaka','886': 'Asia/Taipei','960': 'Indian/Maldives','961': 'Asia/Beirut',
  '962': 'Asia/Amman','963': 'Asia/Damascus','964': 'Asia/Baghdad','965': 'Asia/Kuwait',
  '966': 'Asia/Riyadh','967': 'Asia/Aden','968': 'Asia/Muscat','970': 'Asia/Gaza',
  '971': 'Asia/Dubai','972': 'Asia/Jerusalem','973': 'Asia/Bahrain','974': 'Asia/Qatar',
  '975': 'Asia/Thimphu','976': 'Asia/Ulaanbaatar','977': 'Asia/Kathmandu','992': 'Asia/Dushanbe',
  '993': 'Asia/Ashgabat','994': 'Asia/Baku','995': 'Asia/Tbilisi','996': 'Asia/Bishkek','998': 'Asia/Tashkent',
  '20': 'Africa/Cairo','27': 'Africa/Johannesburg','30': 'Europe/Athens','31': 'Europe/Amsterdam',
  '32': 'Europe/Brussels','33': 'Europe/Paris','34': 'Europe/Madrid','36': 'Europe/Budapest',
  '39': 'Europe/Rome','40': 'Europe/Bucharest','41': 'Europe/Zurich','43': 'Europe/Vienna',
  '44': 'Europe/London','45': 'Europe/Copenhagen','46': 'Europe/Stockholm','47': 'Europe/Oslo',
  '48': 'Europe/Warsaw','49': 'Europe/Berlin','51': 'America/Lima','52': 'America/Mexico_City',
  '53': 'America/Havana','54': 'America/Argentina/Buenos_Aires','55': 'America/Sao_Paulo',
  '56': 'America/Santiago','57': 'America/Bogota','58': 'America/Caracas','60': 'Asia/Kuala_Lumpur',
  '61': 'Australia/Sydney','62': 'Asia/Jakarta','63': 'Asia/Manila','64': 'Pacific/Auckland',
  '65': 'Asia/Singapore','66': 'Asia/Bangkok','7':  'Europe/Moscow','81': 'Asia/Tokyo',
  '82': 'Asia/Seoul','84': 'Asia/Ho_Chi_Minh','86': 'Asia/Shanghai','90': 'Europe/Istanbul',
  '91': 'Asia/Kolkata','92': 'Asia/Karachi','93': 'Asia/Kabul','94': 'Asia/Colombo',
  '95': 'Asia/Rangoon','98': 'Asia/Tehran',
}

const AREA_CODE_TIMEZONES = {
  '201':'America/New_York','202':'America/New_York','203':'America/New_York','204':'America/Winnipeg',
  '205':'America/Chicago','206':'America/Los_Angeles','207':'America/New_York','208':'America/Boise',
  '209':'America/Los_Angeles','210':'America/Chicago','212':'America/New_York','213':'America/Los_Angeles',
  '214':'America/Chicago','215':'America/New_York','216':'America/New_York','217':'America/Chicago',
  '218':'America/Chicago','219':'America/Chicago','220':'America/New_York','223':'America/New_York',
  '224':'America/Chicago','225':'America/Chicago','226':'America/Toronto','228':'America/Chicago',
  '229':'America/New_York','231':'America/Detroit','234':'America/New_York','239':'America/New_York',
  '240':'America/New_York','248':'America/Detroit','249':'America/Toronto','250':'America/Vancouver',
  '251':'America/Chicago','252':'America/New_York','253':'America/Los_Angeles','254':'America/Chicago',
  '256':'America/Chicago','260':'America/Indiana/Indianapolis','262':'America/Chicago','267':'America/New_York',
  '269':'America/Detroit','270':'America/Chicago','272':'America/New_York','276':'America/New_York',
  '281':'America/Chicago','289':'America/Toronto','301':'America/New_York','302':'America/New_York',
  '303':'America/Denver','304':'America/New_York','305':'America/New_York','306':'America/Regina',
  '307':'America/Denver','308':'America/Chicago','309':'America/Chicago','310':'America/Los_Angeles',
  '312':'America/Chicago','313':'America/Detroit','314':'America/Chicago','315':'America/New_York',
  '316':'America/Chicago','317':'America/Indiana/Indianapolis','318':'America/Chicago','319':'America/Chicago',
  '320':'America/Chicago','321':'America/New_York','323':'America/Los_Angeles','325':'America/Chicago',
  '330':'America/New_York','331':'America/Chicago','332':'America/New_York','334':'America/Chicago',
  '336':'America/New_York','337':'America/Chicago','339':'America/New_York','340':'America/St_Thomas',
  '346':'America/Chicago','347':'America/New_York','351':'America/New_York','352':'America/New_York',
  '360':'America/Los_Angeles','361':'America/Chicago','380':'America/New_York','385':'America/Denver',
  '386':'America/New_York','401':'America/New_York','402':'America/Chicago','404':'America/New_York',
  '405':'America/Chicago','406':'America/Denver','407':'America/New_York','408':'America/Los_Angeles',
  '409':'America/Chicago','410':'America/New_York','412':'America/New_York','413':'America/New_York',
  '414':'America/Chicago','415':'America/Los_Angeles','416':'America/Toronto','417':'America/Chicago',
  '418':'America/Toronto','419':'America/New_York','423':'America/New_York','424':'America/Los_Angeles',
  '425':'America/Los_Angeles','430':'America/Chicago','431':'America/Winnipeg','432':'America/Chicago',
  '434':'America/New_York','435':'America/Denver','437':'America/Toronto','438':'America/Toronto',
  '440':'America/New_York','442':'America/Los_Angeles','443':'America/New_York','450':'America/Toronto',
  '458':'America/Los_Angeles','463':'America/Indiana/Indianapolis','469':'America/Chicago','470':'America/New_York',
  '475':'America/New_York','478':'America/New_York','479':'America/Chicago','480':'America/Phoenix',
  '484':'America/New_York','501':'America/Chicago','502':'America/Kentucky/Louisville','503':'America/Los_Angeles',
  '504':'America/Chicago','505':'America/Denver','506':'America/Halifax','507':'America/Chicago',
  '508':'America/New_York','509':'America/Los_Angeles','510':'America/Los_Angeles','512':'America/Chicago',
  '513':'America/New_York','514':'America/Toronto','515':'America/Chicago','516':'America/New_York',
  '517':'America/Detroit','518':'America/New_York','519':'America/Toronto','520':'America/Phoenix',
  '530':'America/Los_Angeles','531':'America/Chicago','534':'America/Chicago','539':'America/Chicago',
  '540':'America/New_York','541':'America/Los_Angeles','548':'America/Toronto','551':'America/New_York',
  '559':'America/Los_Angeles','561':'America/New_York','562':'America/Los_Angeles','563':'America/Chicago',
  '564':'America/Los_Angeles','567':'America/New_York','570':'America/New_York','571':'America/New_York',
  '573':'America/Chicago','574':'America/Indiana/Indianapolis','575':'America/Denver','580':'America/Chicago',
  '585':'America/New_York','586':'America/Detroit','601':'America/Chicago','602':'America/Phoenix',
  '603':'America/New_York','604':'America/Vancouver','605':'America/Chicago','606':'America/New_York',
  '607':'America/New_York','608':'America/Chicago','609':'America/New_York','610':'America/New_York',
  '612':'America/Chicago','613':'America/Toronto','614':'America/New_York','615':'America/Chicago',
  '616':'America/Detroit','617':'America/New_York','618':'America/Chicago','619':'America/Los_Angeles',
  '620':'America/Chicago','623':'America/Phoenix','626':'America/Los_Angeles','628':'America/Los_Angeles',
  '629':'America/Chicago','630':'America/Chicago','631':'America/New_York','636':'America/Chicago',
  '639':'America/Regina','641':'America/Chicago','646':'America/New_York','647':'America/Toronto',
  '650':'America/Los_Angeles','651':'America/Chicago','657':'America/Los_Angeles','660':'America/Chicago',
  '661':'America/Los_Angeles','662':'America/Chicago','667':'America/New_York','669':'America/Los_Angeles',
  '671':'Pacific/Guam','678':'America/New_York','681':'America/New_York','682':'America/Chicago',
  '689':'America/New_York','701':'America/Chicago','702':'America/Los_Angeles','703':'America/New_York',
  '704':'America/New_York','705':'America/Toronto','706':'America/New_York','707':'America/Los_Angeles',
  '708':'America/Chicago','709':'America/St_Johns','712':'America/Chicago','713':'America/Chicago',
  '714':'America/Los_Angeles','715':'America/Chicago','716':'America/New_York','717':'America/New_York',
  '718':'America/New_York','719':'America/Denver','720':'America/Denver','724':'America/New_York',
  '725':'America/Los_Angeles','726':'America/Chicago','727':'America/New_York','730':'America/Chicago',
  '731':'America/Chicago','732':'America/New_York','734':'America/Detroit','737':'America/Chicago',
  '740':'America/New_York','743':'America/New_York','747':'America/Los_Angeles','754':'America/New_York',
  '757':'America/New_York','760':'America/Los_Angeles','762':'America/New_York','763':'America/Chicago',
  '765':'America/Indiana/Indianapolis','769':'America/Chicago','770':'America/New_York','772':'America/New_York',
  '773':'America/Chicago','774':'America/New_York','775':'America/Los_Angeles','779':'America/Chicago',
  '781':'America/New_York','785':'America/Chicago','786':'America/New_York','787':'America/Puerto_Rico',
  '801':'America/Denver','802':'America/New_York','803':'America/New_York','804':'America/New_York',
  '805':'America/Los_Angeles','806':'America/Chicago','807':'America/Toronto','808':'Pacific/Honolulu',
  '810':'America/Detroit','812':'America/Indiana/Indianapolis','813':'America/New_York','814':'America/New_York',
  '815':'America/Chicago','816':'America/Chicago','817':'America/Chicago','818':'America/Los_Angeles',
  '820':'America/Los_Angeles','825':'America/Edmonton','828':'America/New_York','830':'America/Chicago',
  '831':'America/Los_Angeles','832':'America/Chicago','838':'America/New_York','843':'America/New_York',
  '845':'America/New_York','847':'America/Chicago','848':'America/New_York','850':'America/Chicago',
  '854':'America/New_York','856':'America/New_York','857':'America/New_York','858':'America/Los_Angeles',
  '859':'America/Kentucky/Louisville','860':'America/New_York','862':'America/New_York','863':'America/New_York',
  '864':'America/New_York','865':'America/New_York','870':'America/Chicago','872':'America/Chicago',
  '878':'America/New_York','901':'America/Chicago','902':'America/Halifax','903':'America/Chicago',
  '904':'America/New_York','905':'America/Toronto','906':'America/Detroit','907':'America/Anchorage',
  '908':'America/New_York','909':'America/Los_Angeles','910':'America/New_York','912':'America/New_York',
  '913':'America/Chicago','914':'America/New_York','915':'America/Denver','916':'America/Los_Angeles',
  '917':'America/New_York','918':'America/Chicago','919':'America/New_York','920':'America/Chicago',
  '925':'America/Los_Angeles','928':'America/Phoenix','929':'America/New_York','930':'America/Indiana/Indianapolis',
  '931':'America/Chicago','934':'America/New_York','936':'America/Chicago','937':'America/New_York',
  '938':'America/Chicago','939':'America/Puerto_Rico','940':'America/Chicago','941':'America/New_York',
  '947':'America/Detroit','949':'America/Los_Angeles','951':'America/Los_Angeles','952':'America/Chicago',
  '954':'America/New_York','956':'America/Chicago','959':'America/New_York','970':'America/Denver',
  '971':'America/Los_Angeles','972':'America/Chicago','973':'America/New_York','975':'America/Chicago',
  '978':'America/New_York','979':'America/Chicago','980':'America/New_York','984':'America/New_York',
  '985':'America/Chicago','986':'America/Boise','989':'America/Detroit',
}

function getTimezoneFromPhone(phone) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (COUNTRY_TIMEZONES[digits.slice(0, 4)]) return COUNTRY_TIMEZONES[digits.slice(0, 4)]
  if (COUNTRY_TIMEZONES[digits.slice(0, 3)]) return COUNTRY_TIMEZONES[digits.slice(0, 3)]
  if (COUNTRY_TIMEZONES[digits.slice(0, 2)]) return COUNTRY_TIMEZONES[digits.slice(0, 2)]
  if (digits.startsWith('7')) return COUNTRY_TIMEZONES['7']
  if (digits.startsWith('1') && digits.length >= 4) {
    const area = digits.slice(1, 4)
    return AREA_CODE_TIMEZONES[area] || 'America/New_York'
  }
  return null
}

function getLocalTimeInfo(timezone) {
  if (!timezone) return null
  try {
    const now = new Date()
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true, weekday: 'short',
    }).formatToParts(now)
    const get = (type) => parts.find(p => p.type === type)?.value || ''
    const weekday = get('weekday')
    const isWeekend = weekday === 'Sat' || weekday === 'Sun'
    const hour12 = parseInt(get('hour'))
    const minute = parseInt(get('minute'))
    const ampm = get('dayPeriod')
    let hour24 = hour12
    if (ampm === 'PM' && hour12 !== 12) hour24 = hour12 + 12
    if (ampm === 'AM' && hour12 === 12) hour24 = 0
    const totalMins = hour24 * 60 + minute
    const start  = isWeekend ? 11 * 60 : 18 * 60
    const end    = 20 * 60
    const buffer = 30
    let color
    if (totalMins >= start && totalMins <= end) color = 'green'
    else if ((totalMins >= start - buffer && totalMins < start) || (totalMins > end && totalMins <= end + buffer)) color = 'yellow'
    else color = 'red'
    const timeStr = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(now)
    const tzAbbr = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, timeZoneName: 'short',
    }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || ''
    return { time: timeStr, tz: tzAbbr, color }
  } catch { return null }
}

const DOT_COLORS = {
  green:  BRAND.statusBooked,
  yellow: BRAND.statusQualifying,
  red:    BRAND.statusDisqualified,
}

function LocalTimeCell({ phone }) {
  const [info, setInfo] = useState(null)
  useEffect(() => {
    const tz = getTimezoneFromPhone(phone)
    if (!tz) { setInfo(null); return }
    const update = () => setInfo(getLocalTimeInfo(tz))
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [phone])
  if (!info) {
    return <td style={{ padding: '10px 14px', fontSize: 11, color: BRAND.textDim, fontFamily: FONT_BODY }}>—</td>
  }
  return (
    <td style={{ padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 6, height: 6, borderRadius: 999, flexShrink: 0,
          background: DOT_COLORS[info.color],
          boxShadow: `0 0 6px ${DOT_COLORS[info.color]}99`,
        }} />
        <span style={{ fontSize: 11, color: BRAND.textSecondary, fontFamily: FONT_BODY, fontVariantNumeric: 'tabular-nums' }}>{info.time}</span>
        <span style={{ fontSize: 10, color: BRAND.textDim, fontFamily: FONT_BODY, letterSpacing: '0.05em' }}>{info.tz}</span>
      </div>
    </td>
  )
}

function ColumnFilter({ open, onClose, options, selected, onToggle, formatLabel, searchable }) {
  const ref = useRef(null)
  const [search, setSearch] = useState('')
  useEffect(() => {
    if (!open) return
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])
  useEffect(() => { if (!open) setSearch('') }, [open])
  if (!open) return null
  const filteredOptions = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options
  return (
    <div ref={ref}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', top: '100%', left: 0, marginTop: 4,
        background: BRAND.bgRaised, border: `1px solid ${BRAND.borderStrong}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
        zIndex: 100,
        minWidth: 220, maxHeight: 320,
        display: 'flex', flexDirection: 'column', padding: 6,
      }}>
      {searchable && (
        <input autoFocus value={search}
          onChange={e => setSearch(e.target.value)}
          onClick={e => e.stopPropagation()}
          placeholder="SEARCH…"
          style={{
            fontSize: 10, letterSpacing: '0.15em',
            padding: '6px 10px', marginBottom: 4,
            background: BRAND.bg, color: BRAND.textPrimary,
            border: `1px solid ${BRAND.border}`,
            fontFamily: FONT_BODY, outline: 'none',
          }}
        />
      )}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filteredOptions.length === 0 && (
          <p style={{ fontSize: 11, padding: '6px 10px', color: BRAND.textDim, fontFamily: FONT_BODY }}>No options</p>
        )}
        {filteredOptions.map(opt => {
          const isChecked = selected.includes(opt)
          return (
            <div key={opt} onClick={() => onToggle(opt)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px',
                fontSize: 11,
                background: isChecked ? 'rgba(176, 131, 74, 0.13)' : 'transparent',
                color: isChecked ? BRAND.gold : BRAND.textSecondary,
                fontFamily: FONT_BODY,
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = BRAND.bgCardHover }}
              onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = 'transparent' }}>
              <span style={{
                width: 12, height: 12, flexShrink: 0,
                background: isChecked ? BRAND.gold : 'transparent',
                border: `1px solid ${isChecked ? BRAND.gold : BRAND.borderStrong}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: '#000', fontWeight: 700,
              }}>
                {isChecked && '✓'}
              </span>
              <span style={{
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{formatLabel ? formatLabel(opt) : opt}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NotesCell({ contactId, initialNote, onSave }) {
  const [value, setValue] = useState(initialNote || '')
  const debounceRef = useRef(null)
  const textareaRef = useRef(null)
  useEffect(() => { setValue(initialNote || '') }, [initialNote])
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  function handleChange(e) {
    const next = e.target.value
    setValue(next)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSave(contactId, next), 800)
  }
  return (
    <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
      <textarea ref={textareaRef} value={value}
        onChange={handleChange}
        onClick={e => e.stopPropagation()}
        placeholder="Add note…" rows={1}
        style={{
          fontSize: 11,
          padding: '4px 8px', width: '100%', resize: 'none', outline: 'none',
          background: 'transparent', color: BRAND.textSecondary,
          border: `1px solid transparent`,
          fontFamily: FONT_BODY, lineHeight: 1.5,
          overflow: 'hidden', minWidth: 160,
          transition: 'all 0.15s',
        }}
        onFocus={e => { e.target.style.borderColor = BRAND.borderGoldStrong; e.target.style.background = BRAND.bgRaised }}
        onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent' }}
      />
    </td>
  )
}

// ─── Delete confirmation modal ────────────────────────────────────────
function DeleteConfirmModal({ contact, onConfirm, onCancel }) {
  if (!contact) return null
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: BRAND.bgCard,
          border: `1px solid ${BRAND.statusDisqualified}`,
          padding: '28px 32px',
          maxWidth: 460,
          width: '100%',
          boxShadow: `0 0 32px rgba(220, 80, 80, 0.2)`,
        }}>
        <CornerBracket position="tl" size={14} color={BRAND.statusDisqualified} />
        <CornerBracket position="tr" size={14} color={BRAND.statusDisqualified} />
        <CornerBracket position="bl" size={14} color={BRAND.statusDisqualified} />
        <CornerBracket position="br" size={14} color={BRAND.statusDisqualified} />

        <Eyebrow color={BRAND.statusDisqualified} style={{ fontSize: 10, letterSpacing: '0.3em', marginBottom: 8 }}>
          Permanent Delete
        </Eyebrow>
        <GoldRule width={24} />

        <p style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 22, color: BRAND.textPrimary,
          marginTop: 14, marginBottom: 10,
          letterSpacing: '0.01em',
        }}>
          Delete {contact.contactName || 'this contact'}?
        </p>

        <p style={{
          fontSize: 12, color: BRAND.textMuted,
          fontFamily: FONT_BODY, lineHeight: 1.6,
          marginBottom: 22,
        }}>
          This will permanently remove the contact, their call log, notes, tag history,
          campaign enrollments, and message history. <strong style={{ color: BRAND.statusDisqualified }}>This cannot be undone.</strong>
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <BrandButton variant="ghost" size="md" onClick={onCancel}>
            Cancel
          </BrandButton>
          <button onClick={onConfirm}
            style={{
              background: BRAND.statusDisqualified,
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              fontSize: 11, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              fontFamily: FONT_BODY,
              cursor: 'pointer',
            }}>
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Mobile filter sheet ──────────────────────────────────────────────
function FilterSheet({ open, onClose, filters, filterOptions, toggleFilterValue, callWindowColors, callWindowLabels }) {
  const [search, setSearch] = useState({})
  function setSearchFor(key, v) {
    setSearch(prev => ({ ...prev, [key]: v }))
  }

  if (!open) return null

  const sections = [
    { key: 'callWindow', label: 'Call Window' },
    { key: 'tag',        label: 'Tag' },
    { key: 'country',    label: 'Country', searchable: true },
    { key: 'occupation', label: 'Occupation', searchable: true },
    { key: 'bothered',   label: 'Bothered Score' },
    { key: 'age',        label: 'Age' },
    { key: 'source',     label: 'Source' },
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 200,
        display: 'flex', alignItems: 'flex-end',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: BRAND.bg,
          borderTop: `1px solid ${BRAND.borderGoldStrong}`,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.8)',
        }}>
        <CornerBracket position="tl" size={14} />
        <CornerBracket position="tr" size={14} />

        <div style={{
          padding: '18px 20px',
          borderBottom: `1px solid ${BRAND.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0,
          background: BRAND.bg,
          zIndex: 1,
        }}>
          <div>
            <Eyebrow style={{ fontSize: 10, letterSpacing: '0.3em', marginBottom: 6 }}>Filters</Eyebrow>
            <GoldRule width={24} />
          </div>
          <button onClick={onClose}
            style={{
              background: 'transparent', border: `1px solid ${BRAND.border}`,
              color: BRAND.textSecondary,
              padding: '6px 12px', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              fontFamily: FONT_BODY, cursor: 'pointer',
            }}>Close ✕</button>
        </div>

        <div style={{ padding: '12px 16px 24px' }}>
          {sections.map(section => {
            const opts = filterOptions[section.key] || []
            const selected = filters[section.key] || []
            const sectionSearch = search[section.key] || ''
            const filtered = section.searchable && sectionSearch
              ? opts.filter(o => String(o).toLowerCase().includes(sectionSearch.toLowerCase()))
              : opts

            return (
              <div key={section.key} style={{
                marginBottom: 18,
                paddingBottom: 18,
                borderBottom: `1px solid ${BRAND.border}`,
              }}>
                <Eyebrow color={BRAND.textSecondary} style={{
                  fontSize: 9, letterSpacing: '0.3em', marginBottom: 10,
                }}>
                  {section.label}{selected.length > 0 ? ` (${selected.length})` : ''}
                </Eyebrow>

                {section.searchable && opts.length > 10 && (
                  <input
                    value={sectionSearch}
                    onChange={e => setSearchFor(section.key, e.target.value)}
                    placeholder={`SEARCH ${section.label.toUpperCase()}…`}
                    style={{
                      width: '100%',
                      background: BRAND.bgCard,
                      color: BRAND.textPrimary,
                      border: `1px solid ${BRAND.border}`,
                      padding: '8px 12px',
                      fontSize: 10, letterSpacing: '0.12em',
                      fontFamily: FONT_BODY,
                      marginBottom: 8,
                      outline: 'none',
                    }}
                  />
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {filtered.map(opt => {
                    const isChecked = selected.includes(opt)
                    const isCallWindow = section.key === 'callWindow'
                    const swatchColor = isCallWindow ? callWindowColors[opt] : null
                    const label = isCallWindow ? callWindowLabels[opt] : opt

                    return (
                      <button
                        key={opt}
                        onClick={() => toggleFilterValue(section.key, opt)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: isChecked ? 'rgba(176, 131, 74, 0.13)' : 'transparent',
                          color: isChecked ? BRAND.gold : BRAND.textSecondary,
                          border: `1px solid ${isChecked ? BRAND.borderGoldStrong : BRAND.border}`,
                          padding: '6px 11px',
                          fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.15em', textTransform: 'uppercase',
                          fontFamily: FONT_BODY,
                          cursor: 'pointer',
                        }}>
                        {swatchColor && (
                          <span style={{
                            display: 'inline-block',
                            width: 6, height: 6, borderRadius: 999,
                            background: swatchColor,
                            boxShadow: `0 0 6px ${swatchColor}99`,
                          }} />
                        )}
                        <span>{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Mobile contact card ──────────────────────────────────────────────
function MobileContactCard({ contact, log, urgent, tag, onTagChange, onDelete, onCall, contactRef, router }) {
  const struggle   = contact.roadblock || '—'
  const occupation = contact.occupation || '—'
  const bothered   = contact.bothered_score ?? '—'
  const age        = contact.age ?? '—'
  const country    = getCountryName(contact.country)

  function goToProfile(e) {
    const t = e.target
    if (t.closest('a, select, button')) return
    router.push(`/calls/${contact.id}`)
  }

  return (
    <div
      onClick={goToProfile}
      ref={contactRef}
      style={{
        position: 'relative',
        background: BRAND.bgCard,
        border: `1px solid ${urgent ? BRAND.gold : BRAND.border}`,
        boxShadow: urgent ? `0 0 16px ${BRAND.goldFaint}` : 'none',
        padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
        cursor: 'pointer',
        transition: 'border-color 0.2s',
      }}>
      <CornerBracket position="tl" size={10} />
      <CornerBracket position="tr" size={10} />
      <CornerBracket position="bl" size={10} />
      <CornerBracket position="br" size={10} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 999, flexShrink: 0,
          background: urgent ? 'rgba(176, 131, 74, 0.18)' : 'transparent',
          color: BRAND.gold,
          border: `1px solid ${urgent ? BRAND.gold : BRAND.borderGold}`,
          boxShadow: urgent ? `0 0 10px ${BRAND.goldGlow}` : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY,
        }}>
          {(contact.contactName || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontWeight: 600,
            color: urgent ? BRAND.gold : BRAND.textPrimary,
            textShadow: urgent ? `0 0 12px ${BRAND.goldGlow}` : 'none',
            fontFamily: FONT_BODY,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            letterSpacing: '0.01em',
          }}>
            {contact.contactName || 'Unknown'}
          </p>
        </div>
        <select
          value={tag}
          onClick={e => { e.stopPropagation(); e.preventDefault() }}
          onChange={e => { e.stopPropagation(); e.preventDefault(); onTagChange(contact.id, e.target.value) }}
          style={{
            fontSize: 9, fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            padding: '4px 6px',
            background: `${TAG_COLORS[tag]}1f`,
            color: TAG_COLORS[tag],
            border: `1px solid ${TAG_COLORS[tag]}55`,
            fontFamily: FONT_BODY,
            outline: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            maxWidth: 130,
          }}>
          {['uncalled','called once','called twice','called three times','call back','not interested','booked'].map(t => (
            <option key={t} value={t} style={{ background: BRAND.bgRaised, color: TAG_COLORS[t] }}>{t}</option>
          ))}
        </select>
      </div>

      <MobileLocalTimeRow phone={contact.phone} country={country} age={age} />

      {struggle && struggle !== '—' && (
        <p style={{
          fontSize: 11, color: BRAND.textSecondary,
          fontFamily: FONT_BODY,
          lineHeight: 1.5, letterSpacing: '0.01em',
        }}>
          {struggle}
        </p>
      )}

      {(bothered !== '—' || (occupation && occupation !== '—')) && (
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
          fontSize: 10,
          fontFamily: FONT_BODY,
          letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
        }}>
          {bothered !== '—' && (
            <span style={{ color: BRAND.textMuted }}>
              Bothered <span style={{ color: BRAND.gold, fontWeight: 700 }}>{bothered}/5</span>
            </span>
          )}
          {bothered !== '—' && occupation && occupation !== '—' && (
            <span style={{ color: BRAND.textDim }}>·</span>
          )}
          {occupation && occupation !== '—' && (
            <span style={{
              color: BRAND.textMuted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 220,
            }}>{occupation}</span>
          )}
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingTop: 8,
        borderTop: `1px solid ${BRAND.border}`,
      }}>
        {contact.phone ? (
          <>
            <button
              onClick={e => { e.stopPropagation(); onCall(contact) }}
              style={{
                flex: 1, textAlign: 'left',
                fontSize: 12, color: BRAND.gold,
                fontFamily: FONT_BODY,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.02em',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}>
              {formatPhone(contact.phone)}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onCall(contact) }}
              style={{
                padding: '6px 12px',
                fontSize: 10, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: BRAND.gold,
                background: 'rgba(176, 131, 74, 0.13)',
                border: `1px solid ${BRAND.borderGoldStrong}`,
                fontFamily: FONT_BODY,
                cursor: 'pointer',
                flexShrink: 0,
              }}>
              Call
            </button>
          </>
        ) : (
          <span style={{ flex: 1, fontSize: 11, color: BRAND.textDim, fontFamily: FONT_BODY }}>
            No phone
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete(contact) }}
          title="Delete contact"
          style={{
            padding: '6px 10px',
            fontSize: 11,
            color: BRAND.statusDisqualified,
            background: 'transparent',
            border: `1px solid ${BRAND.border}`,
            fontFamily: FONT_BODY,
            cursor: 'pointer',
            flexShrink: 0,
          }}>
          ✕
        </button>
      </div>
    </div>
  )
}

function MobileLocalTimeRow({ phone, country, age }) {
  const [info, setInfo] = useState(null)
  useEffect(() => {
    if (!phone) { setInfo(null); return }
    const tz = getTimezoneFromPhone(phone)
    if (!tz) { setInfo(null); return }
    const update = () => setInfo(getLocalTimeInfo(tz))
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [phone])

  const parts = []
  if (age && age !== '—') parts.push(`${age}Y`)
  if (country && country !== '—') parts.push(country)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 10,
      fontFamily: FONT_BODY,
      letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
      color: BRAND.textMuted,
    }}>
      {info && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: 999, flexShrink: 0,
            background: DOT_COLORS[info.color],
            boxShadow: `0 0 6px ${DOT_COLORS[info.color]}99`,
          }} />
          <span style={{ color: BRAND.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{info.time}</span>
          <span style={{ color: BRAND.textDim }}>{info.tz}</span>
        </span>
      )}
      {info && parts.length > 0 && <span style={{ color: BRAND.textDim }}>·</span>}
      {parts.length > 0 && <span>{parts.join(' · ')}</span>}
    </div>
  )
}

function getCountryName(code) {
  if (!code) return '—'
  if (code.length > 2) return code
  return COUNTRY_CODES[code.toUpperCase()] || code
}

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}hr ago`
  return `${days}d ago`
}

function formatCreated(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function Calls() {
  const isMobile = useIsMobile()
  const router = useRouter()
  const { startCall } = useDialer()
  const [contacts, setContacts] = useState([])
  const [callLogs, setCallLogs] = useState({}) // keyed by lead id (uuid)
  const [loading, setLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created')
  const [timeframe, setTimeframe] = useState('weekly')
  const [perPage, setPerPage] = useState(20)
  const [page, setPage] = useState(1)
  const [selectedRow, setSelectedRow] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [filters, setFilters] = useState({
    country: [], occupation: [], callWindow: [], tag: [], bothered: [], age: [], source: [],
  })
  const [openFilter, setOpenFilter] = useState(null)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  function toggleFilterValue(column, value) {
    setFilters(prev => {
      const current = prev[column] || []
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      return { ...prev, [column]: next }
    })
    setPage(1)
  }

  function clearAllFilters() {
    setFilters({ country: [], occupation: [], callWindow: [], tag: [], bothered: [], age: [], source: [] })
    setSearch('')
    setPage(1)
  }

  const activeFilterCount =
    Object.values(filters).reduce((acc, arr) => acc + (arr.length > 0 ? 1 : 0), 0) + (search ? 1 : 0)

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    function onTagChanged(e) {
      const { leadId, tag, last_contacted } = e.detail || {}
      if (!leadId) return
      setCallLogs(prev => ({
        ...prev,
        [leadId]: {
          ...prev[leadId],
          lead_id: leadId,
          tag,
          last_contacted,
        },
      }))
    }
    window.addEventListener('ld:tag-changed', onTagChanged)
    return () => window.removeEventListener('ld:tag-changed', onTagChanged)
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('callsListState')
      if (saved) {
        const state = JSON.parse(saved)
        if (state.search !== undefined) setSearch(state.search)
        if (state.sortBy)               setSortBy(state.sortBy)
        if (state.timeframe)            setTimeframe(state.timeframe)
        if (state.perPage)              setPerPage(state.perPage)
        if (state.page)                 setPage(state.page)
        if (state.filters)              setFilters({ source: [], occupation: [], ...state.filters })
        if (state.selectedRow)          setSelectedRow(state.selectedRow)
      }
    } catch (err) {
      console.error('Restore error:', err)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem('callsListState', JSON.stringify({
        search, sortBy, timeframe, perPage, page, filters, selectedRow,
      }))
    } catch (err) {
      console.error('State save error:', err)
    }
  }, [hydrated, search, sortBy, timeframe, perPage, page, filters, selectedRow])

  useEffect(() => {
    if (!loading && selectedRow) {
      setTimeout(() => {
        const el = document.getElementById(`contact-row-${selectedRow}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 150)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, contacts])

  async function fetchData() {
    try {
      const { data: leads, error } = await supabase
  .from('leads')
  .select('*')
  .order('created_at', { ascending: false })
  .range(0, 9999)

      if (error) {
        console.error('Failed to load leads:', error)
        setContacts([])
        setCallLogs({})
        setLoading(false)
        return
      }

      const normalized = (leads || []).map(l => ({
        id:           l.id,
        contactName:  l.name || l.ig_handle || '—',
        email:        l.email || '',
        phone:        l.phone || '',
        country:      l.country || '',
        dateAdded:    l.created_at,
        source:       l.source || 'unknown',
        roadblock:        l.roadblock || '',
        occupation:       l.occupation || '',
        bothered_score:   l.bothered_score,
        age:              l.age,
      }))

      setContacts(normalized)

      const { data: logs } = await supabase.from('call_logs').select('*').not('lead_id', 'is', null)
      const logsMap = {}
      logs?.forEach(log => { logsMap[log.lead_id] = log })
      setCallLogs(logsMap)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  async function saveNote(leadId, notes) {
    const existing = callLogs[leadId]
    const now = new Date().toISOString()
    if (existing) {
      await supabase.from('call_logs').update({ notes, updated_at: now }).eq('lead_id', leadId)
    } else {
      await supabase.from('call_logs').insert({ lead_id: leadId, notes })
    }
    setCallLogs(prev => ({ ...prev, [leadId]: { ...prev[leadId], lead_id: leadId, notes } }))
  }

  async function updateTag(leadId, tag) {
    const existing = callLogs[leadId]
    const now = new Date().toISOString()
    if (existing) {
      await supabase.from('call_logs').update({ tag, last_contacted: now, updated_at: now }).eq('lead_id', leadId)
    } else {
      await supabase.from('call_logs').insert({ lead_id: leadId, tag, last_contacted: now })
    }
    setCallLogs(prev => ({ ...prev, [leadId]: { ...prev[leadId], lead_id: leadId, tag, last_contacted: now } }))
    try {
      await handleTagChange(leadId, tag)
    } catch (err) {
      console.error('handleTagChange error:', err)
    }
  }

  async function deleteContact(contact) {
    const leadId = contact.id
    try {
      // campaign_enrollments.contact_id is TEXT (no FK), needs manual delete.
      // messages.lead_id and call_logs.lead_id both CASCADE → handled automatically.
      await supabase.from('campaign_enrollments').delete().eq('contact_id', leadId)
      const { error } = await supabase.from('leads').delete().eq('id', leadId)
      if (error) {
        alert('Delete failed: ' + error.message)
        return
      }
      setContacts(prev => prev.filter(c => c.id !== leadId))
      setCallLogs(prev => {
        const next = { ...prev }
        delete next[leadId]
        return next
      })
      if (selectedRow === leadId) setSelectedRow(null)
      setDeleteTarget(null)
    } catch (err) {
      alert('Delete error: ' + String(err))
    }
  }

  function saveListState(contactId) {
    try {
      const current = JSON.parse(localStorage.getItem('callsListState') || '{}')
      localStorage.setItem('callsListState', JSON.stringify({
        ...current,
        selectedRow: contactId,
      }))
    } catch {}
  }

  const [copiedKey, setCopiedKey] = useState(null)
  function copyToClipboard(text, key) {
    if (!text || text === '—') return
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(prev => prev === key ? null : prev), 1400)
    }).catch(() => {})
  }

  // Fire the dialer for a contact
    function dialContact(contact) {
        if (!contact?.phone) return
        const currentTag = callLogs[contact.id]?.tag || 'uncalled'
        startCall({
            to:         contact.phone,
            leadName:   contact.contactName,
            leadId:     contact.id,
            currentTag,
        })
    }

  function needsCall(tag, lastContacted) {
    if (tag === 'uncalled') return true
    if (['called three times', 'not interested', 'booked'].includes(tag)) return false
    if (['called once', 'called twice', 'call back'].includes(tag)) {
      if (!lastContacted) return true
      const hoursSince = (Date.now() - new Date(lastContacted).getTime()) / 36e5
      return hoursSince >= 24
    }
    return false
  }

  const tags = ['uncalled','called once','called twice','called three times','call back','not interested','booked']
  const answeredTags = ['call back','not interested','booked']

  const now = new Date()
  const getStartDate = () => {
    const d = new Date(now)
    if (timeframe === 'daily')   { d.setHours(0,0,0,0); return d }
    if (timeframe === 'weekly')  { d.setDate(d.getDate() - 7); return d }
    if (timeframe === 'monthly') { d.setDate(d.getDate() - 30); return d }
    return new Date(0)
  }
  const startDate = getStartDate()

  const timeframeContacts = contacts.filter(c => new Date(c.dateAdded) >= startDate)

  function getCallWindowColor(phone) {
    const tz = getTimezoneFromPhone(phone)
    if (!tz) return null
    const info = getLocalTimeInfo(tz)
    return info?.color || null
  }

  const filtered = timeframeContacts
    .filter(c => {
      const tag = callLogs[c.id]?.tag || 'uncalled'
      const countryName    = getCountryName(c.country)
      const occupationVal  = c.occupation || '—'
      const botheredVal    = c.bothered_score ?? '—'
      const ageVal         = c.age ?? '—'
      const sourceVal      = c.source || 'unknown'
      if (filters.country.length && !filters.country.includes(countryName)) return false
      if (filters.occupation.length && !filters.occupation.includes(occupationVal)) return false
      if (filters.tag.length && !filters.tag.includes(tag)) return false
      if (filters.bothered.length && !filters.bothered.includes(String(botheredVal))) return false
      if (filters.age.length && !filters.age.includes(String(ageVal))) return false
      if (filters.source.length && !filters.source.includes(sourceVal)) return false
      if (filters.callWindow.length) {
        const color = getCallWindowColor(c.phone)
        if (!color || !filters.callWindow.includes(color)) return false
      }
      if (search) {
        const s = search.toLowerCase()
        return c.contactName?.toLowerCase().includes(s)
            || c.email?.toLowerCase().includes(s)
            || c.phone?.toLowerCase().includes(s)
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'created') return new Date(b.dateAdded) - new Date(a.dateAdded)
      if (sortBy === 'name') return (a.contactName || '').localeCompare(b.contactName || '')
      if (sortBy === 'country') return getCountryName(a.country).localeCompare(getCountryName(b.country))
      if (sortBy === 'last_contacted') {
        return new Date(callLogs[b.id]?.last_contacted || 0) - new Date(callLogs[a.id]?.last_contacted || 0)
      }
      return 0
    })

  const statTotal = filtered.length
  const statCalled = filtered.filter(c => {
    const tag = callLogs[c.id]?.tag || 'uncalled'
    return !needsCall(tag, callLogs[c.id]?.last_contacted)
  }).length
  const statAnswered = filtered.filter(c => answeredTags.includes(callLogs[c.id]?.tag || 'uncalled')).length
  const statBooked = filtered.filter(c => (callLogs[c.id]?.tag || 'uncalled') === 'booked').length

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const TABLE_COLS = [
    { label: 'Name', w: '160px', filterKey: null },
    { label: 'Created', w: '160px', filterKey: null },
    { label: 'Source', w: '100px', filterKey: 'source' },
    { label: 'Phone', w: '150px', filterKey: null },
    { label: 'Email', w: '200px', filterKey: null },
    { label: 'Biggest Struggle', w: '220px', filterKey: null },
    { label: 'Bothered', w: '90px', filterKey: 'bothered' },
    { label: 'Occupation', w: '180px', filterKey: 'occupation' },
    { label: 'Age', w: '70px', filterKey: 'age' },
    { label: 'Country', w: '130px', filterKey: 'country' },
    { label: 'Local Time', w: '140px', filterKey: 'callWindow' },
    { label: 'Last Contact', w: '110px', filterKey: null },
    { label: 'Notes', w: '190px', filterKey: null },
    { label: 'Tag', w: '170px', filterKey: 'tag' },
    { label: '', w: '50px', filterKey: null },
  ]

  const filterOptions = {
    country: [...new Set(timeframeContacts.map(c => getCountryName(c.country)).filter(Boolean))].sort(),
    occupation: [...new Set(timeframeContacts.map(c => c.occupation).filter(v => v && v !== '—'))].sort(),
    bothered: [...new Set(timeframeContacts.map(c => String(c.bothered_score ?? '—')).filter(v => v !== '—' && v !== 'null'))].sort(),
    age: [...new Set(timeframeContacts.map(c => String(c.age ?? '—')).filter(v => v !== '—' && v !== 'null'))].sort(),
    source: [...new Set(timeframeContacts.map(c => c.source).filter(Boolean))].sort(),
    tag: tags,
    callWindow: ['green', 'yellow', 'red'],
  }

  const callWindowLabels = {
    green:  'Good To Call',
    yellow: 'Within 30 Min',
    red:    'Outside Window',
  }

  const callWindowColors = {
    green:  BRAND.statusBooked,
    yellow: BRAND.statusQualifying,
    red:    BRAND.statusDisqualified,
  }

  function formatCallWindowLabel(v) {
    return (
      <>
        <span style={{
          display: 'inline-block',
          width: 6, height: 6, borderRadius: 999,
          background: callWindowColors[v],
          boxShadow: `0 0 6px ${callWindowColors[v]}99`,
          marginRight: 8, verticalAlign: 'middle',
        }} />
        <span style={{ verticalAlign: 'middle' }}>{callWindowLabels[v]}</span>
      </>
    )
  }

  return (
    <PageBackground style={{ minHeight: '100vh' }}>

      <DeleteConfirmModal
        contact={deleteTarget}
        onConfirm={() => deleteTarget && deleteContact(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      <PageHeader
        pageLabel="Outreach Pipeline"
        leftSlot={
          <Link href="/" style={{ textDecoration: 'none' }}>
            <BrandButton variant="ghost" size="sm">
              {isMobile ? '←' : '← Home'}
            </BrandButton>
          </Link>
        }
        rightSlot={
          <Link href="/email-automation" style={{ textDecoration: 'none' }}>
            <BrandButton variant="solid" size="sm">
              {isMobile ? 'Email →' : 'Email Automation →'}
            </BrandButton>
          </Link>
        }
      />

      <div style={{
        padding: isMobile ? '16px 12px' : '24px 32px',
        maxWidth: 1600, margin: '0 auto',
      }}>

        {/* Timeframe + range note */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          marginBottom: isMobile ? 14 : 20,
        }}>
          <div style={{
            display: 'flex', gap: 0,
            border: `1px solid ${BRAND.border}`,
            width: isMobile ? '100%' : 'auto',
          }}>
            {['daily','weekly','monthly','all'].map((t, i) => {
              const active = timeframe === t
              return (
                <button key={t} onClick={() => { setTimeframe(t); setPage(1) }}
                  style={{
                    background: active ? BRAND.gold : 'transparent',
                    color: active ? '#000' : BRAND.textMuted,
                    border: 'none',
                    borderLeft: i > 0 ? `1px solid ${BRAND.border}` : 'none',
                    padding: isMobile ? '8px 10px' : '6px 16px',
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    fontFamily: FONT_BODY,
                    cursor: 'pointer',
                    flex: isMobile ? 1 : 'initial',
                  }}>{t}</button>
              )
            })}
          </div>
          {!isMobile && (
            <Eyebrow color={BRAND.textDim} style={{ fontSize: 9, letterSpacing: '0.2em' }}>
              {timeframe === 'daily' ? 'Contacts Added Today'
               : timeframe === 'weekly' ? 'Contacts Added This Week'
               : timeframe === 'monthly' ? 'Contacts Added This Month'
               : 'All Contacts'}
            </Eyebrow>
          )}
        </div>

        {/* Stats ribbon */}
        <div style={{
          position: 'relative',
          background: BRAND.bgCard,
          border: `1px solid ${BRAND.border}`,
          marginBottom: isMobile ? 14 : 24,
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 1,
        }}>
          <CornerBracket position="tl" size={14} />
          <CornerBracket position="tr" size={14} />
          <CornerBracket position="bl" size={14} />
          <CornerBracket position="br" size={14} />

          {[
            { label: 'Total Leads', value: statTotal,    color: BRAND.gold },
            { label: 'Called',      value: statCalled,   color: BRAND.statusNew },
            { label: 'Answered',    value: statAnswered, color: BRAND.statusLinkSent },
            { label: 'Booked',      value: statBooked,   color: BRAND.statusBooked },
          ].map((stat, idx) => (
            <div key={stat.label} style={{
              background: BRAND.bgRaised,
              padding: isMobile ? '14px 16px' : '18px 22px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: `linear-gradient(90deg, transparent, ${stat.color}aa, transparent)`,
                opacity: 0.5,
              }} />
              <p style={{
                fontFamily: FONT_DISPLAY,
                fontSize: isMobile ? 26 : 32, fontWeight: 400,
                color: stat.color, lineHeight: 1,
                letterSpacing: '0.02em',
                fontVariantNumeric: 'tabular-nums',
                margin: 0,
              }}>{stat.value}</p>
              <Eyebrow color={BRAND.textMuted} style={{ marginTop: 8, letterSpacing: '0.2em', fontSize: 9 }}>
                {stat.label}
              </Eyebrow>
            </div>
          ))}
        </div>

        {/* Search / Sort / Clear */}
        <div style={{
          display: 'flex',
          alignItems: isMobile ? 'stretch' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 8 : 12,
          marginBottom: isMobile ? 12 : 16,
          flexWrap: 'wrap',
        }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="SEARCH NAME, EMAIL, PHONE…"
            style={{
              flex: 1, minWidth: isMobile ? 0 : 240,
              width: isMobile ? '100%' : 'auto',
              background: BRAND.bgCard, color: BRAND.textPrimary,
              border: `1px solid ${BRAND.border}`,
              padding: '10px 14px',
              fontSize: 11, letterSpacing: '0.15em',
              fontFamily: FONT_BODY, outline: 'none',
            }}
            onFocus={e => { e.target.style.borderColor = BRAND.borderGoldStrong }}
            onBlur={e => { e.target.style.borderColor = BRAND.border }} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{
              background: BRAND.bgCard, color: BRAND.textSecondary,
              border: `1px solid ${BRAND.border}`,
              padding: '10px 14px',
              fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
              fontFamily: FONT_BODY, outline: 'none',
              cursor: 'pointer',
              width: isMobile ? '100%' : 'auto',
            }}>
            <option value="created">Sort: Newest</option>
            <option value="name">Sort: Name</option>
            <option value="country">Sort: Country</option>
            <option value="last_contacted">Sort: Last Contacted</option>
          </select>
          {isMobile && (
            <button onClick={() => setFilterSheetOpen(true)}
              style={{
                background: activeFilterCount > 0 ? 'rgba(176, 131, 74, 0.13)' : 'transparent',
                color: activeFilterCount > 0 ? BRAND.gold : BRAND.textSecondary,
                border: `1px solid ${activeFilterCount > 0 ? BRAND.borderGoldStrong : BRAND.border}`,
                padding: '10px 14px',
                fontSize: 10, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                fontFamily: FONT_BODY,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%',
              }}>
              ▾ Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
          )}
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters}
              style={{
                background: 'rgba(176, 131, 74, 0.13)',
                color: BRAND.gold,
                border: `1px solid ${BRAND.borderGoldStrong}`,
                padding: '10px 14px',
                fontSize: 10, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                fontFamily: FONT_BODY,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: isMobile ? '100%' : 'auto',
              }}>
              Clear Filters ({activeFilterCount}) ✕
            </button>
          )}
        </div>

        {loading ? (
          <Eyebrow color={BRAND.textDim}>Loading contacts...</Eyebrow>
        ) : isMobile ? (
          <>
            {paginated.length === 0 ? (
              <div style={{
                padding: 32, textAlign: 'center',
                background: BRAND.bgCard,
                border: `1px solid ${BRAND.border}`,
              }}>
                <Eyebrow color={BRAND.textDim} style={{ fontSize: 10, letterSpacing: '0.25em' }}>
                  No Contacts Found For This Timeframe
                </Eyebrow>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {paginated.map(contact => {
                  const log = callLogs[contact.id]
                  const tag = log?.tag || 'uncalled'
                  const urgent = needsCall(tag, log?.last_contacted)
                  return (
                    <MobileContactCard
                      key={contact.id}
                      contact={contact}
                      log={log}
                      tag={tag}
                      urgent={urgent}
                      onTagChange={updateTag}
                      onDelete={(c) => setDeleteTarget(c)}
                      onCall={dialContact}
                      router={router}
                    />
                  )
                })}
              </div>
            )}

            <FilterSheet
              open={filterSheetOpen}
              onClose={() => setFilterSheetOpen(false)}
              filters={filters}
              filterOptions={filterOptions}
              toggleFilterValue={toggleFilterValue}
              callWindowColors={callWindowColors}
              callWindowLabels={callWindowLabels}
            />

            {/* Mobile pagination */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 16, gap: 12, flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eyebrow color={BRAND.textDim} style={{ fontSize: 9, letterSpacing: '0.2em' }}>Per Page</Eyebrow>
                <div style={{ display: 'flex', gap: 0, border: `1px solid ${BRAND.border}` }}>
                  {[20, 50].map((n, i) => {
                    const active = perPage === n
                    return (
                      <button key={n} onClick={() => { setPerPage(n); setPage(1) }}
                        style={{
                          background: active ? BRAND.gold : 'transparent',
                          color: active ? '#000' : BRAND.textMuted,
                          border: 'none',
                          borderLeft: i > 0 ? `1px solid ${BRAND.border}` : 'none',
                          padding: '5px 12px',
                          fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.1em',
                          fontFamily: FONT_BODY,
                          cursor: 'pointer',
                          fontVariantNumeric: 'tabular-nums',
                        }}>{n}</button>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 10, color: BRAND.textDim,
                  letterSpacing: '0.15em', fontWeight: 600,
                  fontFamily: FONT_BODY, textTransform: 'uppercase',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {filtered.length === 0 ? '0' : `${(page - 1) * perPage + 1}–${Math.min(page * perPage, filtered.length)}`} of {filtered.length}
                </span>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{
                    background: BRAND.bgRaised,
                    color: page === 1 ? BRAND.textDim : BRAND.textSecondary,
                    border: `1px solid ${BRAND.border}`,
                    padding: '6px 14px',
                    fontSize: 12,
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    fontFamily: FONT_BODY,
                  }}>←</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
                  style={{
                    background: BRAND.bgRaised,
                    color: (page === totalPages || totalPages === 0) ? BRAND.textDim : BRAND.textSecondary,
                    border: `1px solid ${BRAND.border}`,
                    padding: '6px 14px',
                    fontSize: 12,
                    cursor: (page === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                    fontFamily: FONT_BODY,
                  }}>→</button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Desktop table */}
            <div style={{ overflow: 'auto', border: `1px solid ${BRAND.border}` }}>
              <table style={{ minWidth: 1920, width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: BRAND.bgCard, borderBottom: `1px solid ${BRAND.border}` }}>
                    {TABLE_COLS.map((h, idx) => {
                      const isFiltered = h.filterKey && filters[h.filterKey]?.length > 0
                      const isFilterable = !!h.filterKey
                      const isOpen = openFilter === h.filterKey
                      return (
                        <th key={h.label + idx}
                          style={{
                            textAlign: 'left',
                            padding: '12px 14px',
                            fontSize: 9, fontWeight: 700,
                            letterSpacing: '0.2em', textTransform: 'uppercase',
                            color: isFiltered ? BRAND.gold : BRAND.textMuted,
                            fontFamily: FONT_BODY,
                            width: h.w, minWidth: h.w,
                            position: idx === 0 ? 'sticky' : 'relative',
                            ...(idx === 0 ? {
                              left: 0, zIndex: isOpen ? 100 : 2,
                              background: BRAND.bgCard,
                              borderRight: `1px solid ${BRAND.border}`,
                            } : {})
                          }}>
                          {isFilterable ? (
                            <div
                              onClick={e => { e.stopPropagation(); setOpenFilter(isOpen ? null : h.filterKey) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                              <span>{h.label}</span>
                              <span style={{ fontSize: 8, opacity: isFiltered ? 1 : 0.5 }}>▼</span>
                              {isFiltered && (
                                <span style={{
                                  background: BRAND.gold, color: '#000',
                                  fontSize: 9, fontWeight: 700, padding: '1px 6px',
                                  marginLeft: 2,
                                }}>{filters[h.filterKey].length}</span>
                              )}
                              <ColumnFilter
                                open={isOpen}
                                onClose={() => setOpenFilter(null)}
                                options={filterOptions[h.filterKey] || []}
                                selected={filters[h.filterKey] || []}
                                onToggle={v => toggleFilterValue(h.filterKey, v)}
                                formatLabel={h.filterKey === 'callWindow' ? formatCallWindowLabel : null}
                                searchable={h.filterKey === 'country' || h.filterKey === 'occupation'}
                              />
                            </div>
                          ) : (
                            h.label
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={TABLE_COLS.length}
                        style={{
                          padding: 32, textAlign: 'center',
                          fontSize: 11, color: BRAND.textDim,
                          fontFamily: FONT_BODY,
                          letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600,
                        }}>
                        No Contacts Found For This Timeframe
                      </td>
                    </tr>
                  )}
                  {paginated.map((contact, i) => {
                    const log = callLogs[contact.id]
                    const tag = log?.tag || 'uncalled'
                    const isSelected = selectedRow === contact.id
                    const baseRowBg = i % 2 === 0 ? BRAND.bgCard : BRAND.bgRaised
                    const rowBg = isSelected ? '#1a160f' : baseRowBg
                    const urgent = needsCall(tag, log?.last_contacted)
                    return (
                      <tr key={contact.id}
                        id={`contact-row-${contact.id}`}
                        onClick={() => setSelectedRow(prev => prev === contact.id ? null : contact.id)}
                        style={{
                          background: rowBg,
                          borderBottom: `1px solid ${BRAND.border}`,
                          cursor: 'pointer',
                          outline: isSelected ? `1px solid ${BRAND.borderGoldStrong}` : 'none',
                          outlineOffset: -1,
                        }}>
                        <td style={{
                          padding: '10px 14px',
                          fontWeight: 500,
                          position: 'sticky', left: 0, zIndex: 1,
                          background: rowBg,
                          borderRight: `1px solid ${BRAND.border}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 26, height: 26, borderRadius: 999,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, flexShrink: 0,
                              background: urgent ? 'rgba(176, 131, 74, 0.18)' : 'transparent',
                              color: BRAND.gold,
                              border: `1px solid ${urgent ? BRAND.gold : BRAND.borderGold}`,
                              boxShadow: urgent ? `0 0 10px ${BRAND.goldGlow}` : 'none',
                              fontFamily: FONT_BODY,
                            }}>
                              {(contact.contactName || '?')[0].toUpperCase()}
                            </div>
                            <Link
                              href={`/calls/${contact.id}`}
                              onClick={e => {
                                e.stopPropagation()
                                saveListState(contact.id)
                              }}
                              style={{
                                color: urgent ? BRAND.gold : BRAND.textPrimary,
                                textShadow: urgent ? `0 0 12px ${BRAND.goldGlow}` : 'none',
                                fontWeight: urgent ? 600 : 400,
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s',
                                textDecoration: 'none',
                                borderBottom: '1px dotted transparent',
                                fontFamily: FONT_BODY,
                                fontSize: 12,
                                letterSpacing: '0.01em',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderBottomColor = urgent ? BRAND.gold : BRAND.textMuted }}
                              onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'transparent' }}>
                              {contact.contactName || '—'}
                            </Link>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 10, color: BRAND.textMuted, fontFamily: FONT_BODY, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCreated(contact.dateAdded)}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 10, color: BRAND.textMuted, fontFamily: FONT_BODY, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          {contact.source}
                        </td>
                        <td style={{ padding: '10px 14px', color: BRAND.textSecondary, fontFamily: FONT_BODY, fontVariantNumeric: 'tabular-nums' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {contact.phone ? (
                              <button
                                onClick={e => { e.stopPropagation(); dialContact(contact) }}
                                title="Call via Twilio dialer"
                                style={{
                                  whiteSpace: 'nowrap',
                                  fontSize: 11,
                                  color: BRAND.gold,
                                  background: 'transparent',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  fontFamily: FONT_BODY,
                                  fontVariantNumeric: 'tabular-nums',
                                  borderBottom: '1px dotted transparent',
                                  transition: 'border-color 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderBottomColor = BRAND.gold }}
                                onMouseLeave={e => { e.currentTarget.style.borderBottomColor = 'transparent' }}>
                                {formatPhone(contact.phone)}
                              </button>
                            ) : (
                              <span style={{ whiteSpace: 'nowrap', fontSize: 11 }}>—</span>
                            )}
                            {contact.phone && (
                              <div style={{ position: 'relative', display: 'inline-flex' }}>
                                <button onClick={e => { e.stopPropagation(); copyToClipboard(contact.phone, `phone-${contact.id}`) }}
                                  title="Copy phone"
                                  style={{
                                    flexShrink: 0, color: BRAND.textDim,
                                    background: 'transparent',
                                    border: `1px solid ${BRAND.border}`,
                                    padding: '1px 5px', fontSize: 10, lineHeight: 1.4, cursor: 'pointer',
                                    fontFamily: FONT_BODY,
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.color = BRAND.gold; e.currentTarget.style.borderColor = BRAND.borderGoldStrong }}
                                  onMouseLeave={e => { e.currentTarget.style.color = BRAND.textDim; e.currentTarget.style.borderColor = BRAND.border }}>
                                  ⎘
                                </button>
                                {copiedKey === `phone-${contact.id}` && (
                                  <span style={{
                                    position: 'absolute',
                                    bottom: 'calc(100% + 4px)', left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: BRAND.gold, color: '#000',
                                    padding: '3px 8px', fontSize: 9, fontWeight: 700,
                                    letterSpacing: '0.15em', textTransform: 'uppercase',
                                    fontFamily: FONT_BODY, whiteSpace: 'nowrap',
                                    pointerEvents: 'none', zIndex: 20,
                                    boxShadow: `0 0 12px ${BRAND.goldGlow}`,
                                  }}>Copied</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: BRAND.textSecondary, fontFamily: FONT_BODY }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, fontSize: 11, display: 'block' }}>{contact.email || '—'}</span>
                            {contact.email && (
                              <div style={{ position: 'relative', display: 'inline-flex' }}>
                                <button onClick={e => { e.stopPropagation(); copyToClipboard(contact.email, `email-${contact.id}`) }}
                                  title="Copy email"
                                  style={{
                                    flexShrink: 0, color: BRAND.textDim,
                                    background: 'transparent',
                                    border: `1px solid ${BRAND.border}`,
                                    padding: '1px 5px', fontSize: 10, lineHeight: 1.4, cursor: 'pointer',
                                    fontFamily: FONT_BODY,
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.color = BRAND.gold; e.currentTarget.style.borderColor = BRAND.borderGoldStrong }}
                                  onMouseLeave={e => { e.currentTarget.style.color = BRAND.textDim; e.currentTarget.style.borderColor = BRAND.border }}>
                                  ⎘
                                </button>
                                {copiedKey === `email-${contact.id}` && (
                                  <span style={{
                                    position: 'absolute',
                                    bottom: 'calc(100% + 4px)', left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: BRAND.gold, color: '#000',
                                    padding: '3px 8px', fontSize: 9, fontWeight: 700,
                                    letterSpacing: '0.15em', textTransform: 'uppercase',
                                    fontFamily: FONT_BODY, whiteSpace: 'nowrap',
                                    pointerEvents: 'none', zIndex: 20,
                                    boxShadow: `0 0 12px ${BRAND.goldGlow}`,
                                  }}>Copied</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: BRAND.textSecondary, fontFamily: FONT_BODY, fontSize: 11 }}>
                          <span style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{contact.roadblock || '—'}</span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: BRAND.textSecondary, fontFamily: FONT_BODY, fontVariantNumeric: 'tabular-nums', fontSize: 12, fontWeight: 600 }}>
                          {contact.bothered_score ?? '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: BRAND.textSecondary, fontFamily: FONT_BODY, fontSize: 11 }}>
                          <span style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{contact.occupation || '—'}</span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: BRAND.textSecondary, fontFamily: FONT_BODY, fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                          {contact.age ?? '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: BRAND.textSecondary, fontFamily: FONT_BODY, fontSize: 11 }}>
                          {getCountryName(contact.country)}
                        </td>
                        <LocalTimeCell phone={contact.phone} />
                        <td style={{ padding: '10px 14px', fontSize: 10, color: BRAND.textDim, fontFamily: FONT_BODY, letterSpacing: '0.05em' }}>
                          {timeAgo(log?.last_contacted)}
                        </td>
                        <NotesCell contactId={contact.id} initialNote={log?.notes} onSave={saveNote} />
                        <td style={{ padding: '10px 14px' }}>
                          <select value={tag}
                            onClick={e => e.stopPropagation()}
                            onChange={e => { e.stopPropagation(); updateTag(contact.id, e.target.value) }}
                            style={{
                              fontSize: 10, fontWeight: 700,
                              letterSpacing: '0.15em', textTransform: 'uppercase',
                              padding: '5px 8px', width: '100%',
                              background: `${TAG_COLORS[tag]}1f`,
                              color: TAG_COLORS[tag],
                              border: `1px solid ${TAG_COLORS[tag]}55`,
                              fontFamily: FONT_BODY,
                              outline: 'none',
                              cursor: 'pointer',
                            }}>
                            {tags.map(t => (
                              <option key={t} value={t} style={{ background: BRAND.bgRaised, color: TAG_COLORS[t] }}>{t}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteTarget(contact) }}
                            title="Delete contact"
                            style={{
                              color: BRAND.textDim,
                              background: 'transparent',
                              border: `1px solid ${BRAND.border}`,
                              padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                              fontFamily: FONT_BODY,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = BRAND.statusDisqualified; e.currentTarget.style.borderColor = BRAND.statusDisqualified }}
                            onMouseLeave={e => { e.currentTarget.style.color = BRAND.textDim; e.currentTarget.style.borderColor = BRAND.border }}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Desktop pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Eyebrow color={BRAND.textDim} style={{ fontSize: 9, letterSpacing: '0.2em' }}>Rows Per Page</Eyebrow>
                <div style={{ display: 'flex', gap: 0, border: `1px solid ${BRAND.border}` }}>
                  {[20, 50].map((n, i) => {
                    const active = perPage === n
                    return (
                      <button key={n} onClick={() => { setPerPage(n); setPage(1) }}
                        style={{
                          background: active ? BRAND.gold : 'transparent',
                          color: active ? '#000' : BRAND.textMuted,
                          border: 'none',
                          borderLeft: i > 0 ? `1px solid ${BRAND.border}` : 'none',
                          padding: '5px 12px',
                          fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.1em',
                          fontFamily: FONT_BODY,
                          cursor: 'pointer',
                          fontVariantNumeric: 'tabular-nums',
                        }}>{n}</button>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontSize: 10, color: BRAND.textDim,
                  letterSpacing: '0.15em', fontWeight: 600,
                  fontFamily: FONT_BODY, textTransform: 'uppercase',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {filtered.length === 0 ? '0' : `${(page - 1) * perPage + 1}–${Math.min(page * perPage, filtered.length)}`} of {filtered.length}
                </span>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{
                    background: BRAND.bgRaised,
                    color: page === 1 ? BRAND.textDim : BRAND.textSecondary,
                    border: `1px solid ${BRAND.border}`,
                    padding: '5px 14px',
                    fontSize: 12,
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    fontFamily: FONT_BODY,
                  }}>←</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
                  style={{
                    background: BRAND.bgRaised,
                    color: (page === totalPages || totalPages === 0) ? BRAND.textDim : BRAND.textSecondary,
                    border: `1px solid ${BRAND.border}`,
                    padding: '5px 14px',
                    fontSize: 12,
                    cursor: (page === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer',
                    fontFamily: FONT_BODY,
                  }}>→</button>
              </div>
            </div>

            {!isMobile && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                marginTop: 16,
                flexWrap: 'wrap',
              }}>
                <Eyebrow color={BRAND.textDim} style={{ fontSize: 9, letterSpacing: '0.25em' }}>Call Window</Eyebrow>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
                  {[
                    { color: BRAND.statusBooked,       label: 'Good To Call (6–8pm · Wknd 11am–8pm)' },
                    { color: BRAND.statusQualifying,   label: 'Within 30 Min' },
                    { color: BRAND.statusDisqualified, label: 'Outside Window' },
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: 999, flexShrink: 0,
                        background: color,
                        boxShadow: `0 0 6px ${color}99`,
                      }} />
                      <span style={{
                        fontSize: 10, color: BRAND.textMuted,
                        fontFamily: FONT_BODY,
                        letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
                      }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageBackground>
  )
}