'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const FIELD_IDS = {
  struggle: 'WtsEP55kDKmuYvjR3cRM',
  bothered: 'b9izCUDE2DcOqViZ6Da4',
  age: 'gvlEzRdj7FhoOw6Yk0p6',
  invest: 'xLhl7frOJAopwN0r94gX'
}

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

// Country calling code (as string) → IANA timezone
// 4-digit prefixes first to avoid prefix conflicts (e.g. 1876 Jamaica vs 1 US)
const COUNTRY_TIMEZONES = {
  '1876': 'America/Jamaica',
  '1868': 'America/Port_of_Spain',
  '1246': 'America/Barbados',
  '1242': 'America/Nassau',
  '1264': 'America/Anguilla',
  '1268': 'America/Antigua',
  '1284': 'America/Tortola',
  '1340': 'America/St_Thomas',
  '1345': 'America/Cayman',
  '1441': 'America/Bermuda',
  '1473': 'America/Grenada',
  '1649': 'America/Grand_Turk',
  '1664': 'America/Montserrat',
  '1721': 'America/Lower_Princes',
  '1758': 'America/St_Lucia',
  '1767': 'America/Dominica',
  '1784': 'America/St_Vincent',
  '1787': 'America/Puerto_Rico',
  '1809': 'America/Santo_Domingo',
  '1829': 'America/Santo_Domingo',
  '1849': 'America/Santo_Domingo',
  '1868': 'America/Port_of_Spain',
  '1869': 'America/St_Kitts',
  '1670': 'Pacific/Saipan',
  '1671': 'Pacific/Guam',
  // 3-digit country codes
  '213': 'Africa/Algiers',
  '216': 'Africa/Tunis',
  '218': 'Africa/Tripoli',
  '220': 'Africa/Banjul',
  '221': 'Africa/Dakar',
  '222': 'Africa/Nouakchott',
  '223': 'Africa/Bamako',
  '224': 'Africa/Conakry',
  '225': 'Africa/Abidjan',
  '226': 'Africa/Ouagadougou',
  '227': 'Africa/Niamey',
  '228': 'Africa/Lome',
  '229': 'Africa/Porto-Novo',
  '230': 'Indian/Mauritius',
  '231': 'Africa/Monrovia',
  '232': 'Africa/Freetown',
  '233': 'Africa/Accra',
  '234': 'Africa/Lagos',
  '235': 'Africa/Ndjamena',
  '236': 'Africa/Bangui',
  '237': 'Africa/Douala',
  '238': 'Atlantic/Cape_Verde',
  '239': 'Africa/Sao_Tome',
  '240': 'Africa/Malabo',
  '241': 'Africa/Libreville',
  '242': 'Africa/Brazzaville',
  '243': 'Africa/Kinshasa',
  '244': 'Africa/Luanda',
  '245': 'Africa/Bissau',
  '246': 'Indian/Chagos',
  '247': 'Atlantic/St_Helena',
  '248': 'Indian/Mahe',
  '249': 'Africa/Khartoum',
  '250': 'Africa/Kigali',
  '251': 'Africa/Addis_Ababa',
  '252': 'Africa/Mogadishu',
  '253': 'Africa/Djibouti',
  '254': 'Africa/Nairobi',
  '255': 'Africa/Dar_es_Salaam',
  '256': 'Africa/Kampala',
  '257': 'Africa/Bujumbura',
  '258': 'Africa/Maputo',
  '260': 'Africa/Lusaka',
  '261': 'Indian/Antananarivo',
  '262': 'Indian/Reunion',
  '263': 'Africa/Harare',
  '264': 'Africa/Windhoek',
  '265': 'Africa/Blantyre',
  '266': 'Africa/Maseru',
  '267': 'Africa/Gaborone',
  '268': 'Africa/Mbabane',
  '269': 'Indian/Comoro',
  '290': 'Atlantic/St_Helena',
  '291': 'Africa/Asmara',
  '297': 'America/Aruba',
  '298': 'Atlantic/Faroe',
  '299': 'America/Godthab',
  '350': 'Europe/Gibraltar',
  '351': 'Europe/Lisbon',
  '352': 'Europe/Luxembourg',
  '353': 'Europe/Dublin',
  '354': 'Atlantic/Reykjavik',
  '355': 'Europe/Tirane',
  '356': 'Europe/Malta',
  '357': 'Asia/Nicosia',
  '358': 'Europe/Helsinki',
  '359': 'Europe/Sofia',
  '370': 'Europe/Vilnius',
  '371': 'Europe/Riga',
  '372': 'Europe/Tallinn',
  '373': 'Europe/Chisinau',
  '374': 'Asia/Yerevan',
  '375': 'Europe/Minsk',
  '376': 'Europe/Andorra',
  '377': 'Europe/Monaco',
  '378': 'Europe/San_Marino',
  '380': 'Europe/Kiev',
  '381': 'Europe/Belgrade',
  '382': 'Europe/Podgorica',
  '385': 'Europe/Zagreb',
  '386': 'Europe/Ljubljana',
  '387': 'Europe/Sarajevo',
  '389': 'Europe/Skopje',
  '420': 'Europe/Prague',
  '421': 'Europe/Bratislava',
  '423': 'Europe/Vaduz',
  '500': 'Atlantic/Stanley',
  '501': 'America/Belize',
  '502': 'America/Guatemala',
  '503': 'America/El_Salvador',
  '504': 'America/Tegucigalpa',
  '505': 'America/Managua',
  '506': 'America/Costa_Rica',
  '507': 'America/Panama',
  '508': 'America/Miquelon',
  '509': 'America/Port-au-Prince',
  '590': 'America/Guadeloupe',
  '591': 'America/La_Paz',
  '592': 'America/Guyana',
  '593': 'America/Guayaquil',
  '594': 'America/Cayenne',
  '595': 'America/Asuncion',
  '596': 'America/Martinique',
  '597': 'America/Paramaribo',
  '598': 'America/Montevideo',
  '599': 'America/Curacao',
  '670': 'Asia/Dili',
  '672': 'Antarctica/South_Pole',
  '673': 'Asia/Brunei',
  '674': 'Pacific/Nauru',
  '675': 'Pacific/Port_Moresby',
  '676': 'Pacific/Tongatapu',
  '677': 'Pacific/Guadalcanal',
  '678': 'Pacific/Efate',
  '679': 'Pacific/Fiji',
  '680': 'Pacific/Palau',
  '681': 'Pacific/Wallis',
  '682': 'Pacific/Rarotonga',
  '683': 'Pacific/Niue',
  '685': 'Pacific/Apia',
  '686': 'Pacific/Tarawa',
  '687': 'Pacific/Noumea',
  '688': 'Pacific/Funafuti',
  '689': 'Pacific/Tahiti',
  '690': 'Pacific/Fakaofo',
  '691': 'Pacific/Pohnpei',
  '692': 'Pacific/Majuro',
  '850': 'Asia/Pyongyang',
  '852': 'Asia/Hong_Kong',
  '853': 'Asia/Macau',
  '855': 'Asia/Phnom_Penh',
  '856': 'Asia/Vientiane',
  '880': 'Asia/Dhaka',
  '886': 'Asia/Taipei',
  '960': 'Indian/Maldives',
  '961': 'Asia/Beirut',
  '962': 'Asia/Amman',
  '963': 'Asia/Damascus',
  '964': 'Asia/Baghdad',
  '965': 'Asia/Kuwait',
  '966': 'Asia/Riyadh',
  '967': 'Asia/Aden',
  '968': 'Asia/Muscat',
  '970': 'Asia/Gaza',
  '971': 'Asia/Dubai',
  '972': 'Asia/Jerusalem',
  '973': 'Asia/Bahrain',
  '974': 'Asia/Qatar',
  '975': 'Asia/Thimphu',
  '976': 'Asia/Ulaanbaatar',
  '977': 'Asia/Kathmandu',
  '992': 'Asia/Dushanbe',
  '993': 'Asia/Ashgabat',
  '994': 'Asia/Baku',
  '995': 'Asia/Tbilisi',
  '996': 'Asia/Bishkek',
  '998': 'Asia/Tashkent',
  // 2-digit country codes
  '20': 'Africa/Cairo',
  '27': 'Africa/Johannesburg',
  '30': 'Europe/Athens',
  '31': 'Europe/Amsterdam',
  '32': 'Europe/Brussels',
  '33': 'Europe/Paris',
  '34': 'Europe/Madrid',
  '36': 'Europe/Budapest',
  '39': 'Europe/Rome',
  '40': 'Europe/Bucharest',
  '41': 'Europe/Zurich',
  '43': 'Europe/Vienna',
  '44': 'Europe/London',
  '45': 'Europe/Copenhagen',
  '46': 'Europe/Stockholm',
  '47': 'Europe/Oslo',
  '48': 'Europe/Warsaw',
  '49': 'Europe/Berlin',
  '51': 'America/Lima',
  '52': 'America/Mexico_City',
  '53': 'America/Havana',
  '54': 'America/Argentina/Buenos_Aires',
  '55': 'America/Sao_Paulo',
  '56': 'America/Santiago',
  '57': 'America/Bogota',
  '58': 'America/Caracas',
  '60': 'Asia/Kuala_Lumpur',
  '61': 'Australia/Sydney',
  '62': 'Asia/Jakarta',
  '63': 'Asia/Manila',
  '64': 'Pacific/Auckland',
  '65': 'Asia/Singapore',
  '66': 'Asia/Bangkok',
  '7':  'Europe/Moscow',
  '81': 'Asia/Tokyo',
  '82': 'Asia/Seoul',
  '84': 'Asia/Ho_Chi_Minh',
  '86': 'Asia/Shanghai',
  '90': 'Europe/Istanbul',
  '91': 'Asia/Kolkata',
  '92': 'Asia/Karachi',
  '93': 'Asia/Kabul',
  '94': 'Asia/Colombo',
  '95': 'Asia/Rangoon',
  '98': 'Asia/Tehran',
}

// US/Canada area code → IANA timezone
const AREA_CODE_TIMEZONES = {
  '201':'America/New_York','202':'America/New_York','203':'America/New_York',
  '204':'America/Winnipeg','205':'America/Chicago','206':'America/Los_Angeles',
  '207':'America/New_York','208':'America/Boise','209':'America/Los_Angeles',
  '210':'America/Chicago','212':'America/New_York','213':'America/Los_Angeles',
  '214':'America/Chicago','215':'America/New_York','216':'America/New_York',
  '217':'America/Chicago','218':'America/Chicago','219':'America/Chicago',
  '220':'America/New_York','223':'America/New_York','224':'America/Chicago',
  '225':'America/Chicago','226':'America/Toronto','228':'America/Chicago',
  '229':'America/New_York','231':'America/Detroit','234':'America/New_York',
  '239':'America/New_York','240':'America/New_York','248':'America/Detroit',
  '249':'America/Toronto','250':'America/Vancouver','251':'America/Chicago',
  '252':'America/New_York','253':'America/Los_Angeles','254':'America/Chicago',
  '256':'America/Chicago','260':'America/Indiana/Indianapolis','262':'America/Chicago',
  '267':'America/New_York','269':'America/Detroit','270':'America/Chicago',
  '272':'America/New_York','276':'America/New_York','281':'America/Chicago',
  '289':'America/Toronto','301':'America/New_York','302':'America/New_York',
  '303':'America/Denver','304':'America/New_York','305':'America/New_York',
  '306':'America/Regina','307':'America/Denver','308':'America/Chicago',
  '309':'America/Chicago','310':'America/Los_Angeles','312':'America/Chicago',
  '313':'America/Detroit','314':'America/Chicago','315':'America/New_York',
  '316':'America/Chicago','317':'America/Indiana/Indianapolis','318':'America/Chicago',
  '319':'America/Chicago','320':'America/Chicago','321':'America/New_York',
  '323':'America/Los_Angeles','325':'America/Chicago','330':'America/New_York',
  '331':'America/Chicago','332':'America/New_York','334':'America/Chicago',
  '336':'America/New_York','337':'America/Chicago','339':'America/New_York',
  '340':'America/St_Thomas','346':'America/Chicago','347':'America/New_York',
  '351':'America/New_York','352':'America/New_York','360':'America/Los_Angeles',
  '361':'America/Chicago','380':'America/New_York','385':'America/Denver',
  '386':'America/New_York','401':'America/New_York','402':'America/Chicago',
  '404':'America/New_York','405':'America/Chicago','406':'America/Denver',
  '407':'America/New_York','408':'America/Los_Angeles','409':'America/Chicago',
  '410':'America/New_York','412':'America/New_York','413':'America/New_York',
  '414':'America/Chicago','415':'America/Los_Angeles','416':'America/Toronto',
  '417':'America/Chicago','418':'America/Toronto','419':'America/New_York',
  '423':'America/New_York','424':'America/Los_Angeles','425':'America/Los_Angeles',
  '430':'America/Chicago','431':'America/Winnipeg','432':'America/Chicago',
  '434':'America/New_York','435':'America/Denver','437':'America/Toronto',
  '438':'America/Toronto','440':'America/New_York','442':'America/Los_Angeles',
  '443':'America/New_York','450':'America/Toronto','458':'America/Los_Angeles',
  '463':'America/Indiana/Indianapolis','469':'America/Chicago','470':'America/New_York',
  '475':'America/New_York','478':'America/New_York','479':'America/Chicago',
  '480':'America/Phoenix','484':'America/New_York','501':'America/Chicago',
  '502':'America/Kentucky/Louisville','503':'America/Los_Angeles','504':'America/Chicago',
  '505':'America/Denver','506':'America/Halifax','507':'America/Chicago',
  '508':'America/New_York','509':'America/Los_Angeles','510':'America/Los_Angeles',
  '512':'America/Chicago','513':'America/New_York','514':'America/Toronto',
  '515':'America/Chicago','516':'America/New_York','517':'America/Detroit',
  '518':'America/New_York','519':'America/Toronto','520':'America/Phoenix',
  '530':'America/Los_Angeles','531':'America/Chicago','534':'America/Chicago',
  '539':'America/Chicago','540':'America/New_York','541':'America/Los_Angeles',
  '548':'America/Toronto','551':'America/New_York','559':'America/Los_Angeles',
  '561':'America/New_York','562':'America/Los_Angeles','563':'America/Chicago',
  '564':'America/Los_Angeles','567':'America/New_York','570':'America/New_York',
  '571':'America/New_York','573':'America/Chicago','574':'America/Indiana/Indianapolis',
  '575':'America/Denver','580':'America/Chicago','585':'America/New_York',
  '586':'America/Detroit','601':'America/Chicago','602':'America/Phoenix',
  '603':'America/New_York','604':'America/Vancouver','605':'America/Chicago',
  '606':'America/New_York','607':'America/New_York','608':'America/Chicago',
  '609':'America/New_York','610':'America/New_York','612':'America/Chicago',
  '613':'America/Toronto','614':'America/New_York','615':'America/Chicago',
  '616':'America/Detroit','617':'America/New_York','618':'America/Chicago',
  '619':'America/Los_Angeles','620':'America/Chicago','623':'America/Phoenix',
  '626':'America/Los_Angeles','628':'America/Los_Angeles','629':'America/Chicago',
  '630':'America/Chicago','631':'America/New_York','636':'America/Chicago',
  '639':'America/Regina','641':'America/Chicago','646':'America/New_York',
  '647':'America/Toronto','650':'America/Los_Angeles','651':'America/Chicago',
  '657':'America/Los_Angeles','660':'America/Chicago','661':'America/Los_Angeles',
  '662':'America/Chicago','667':'America/New_York','669':'America/Los_Angeles',
  '671':'Pacific/Guam','678':'America/New_York','681':'America/New_York',
  '682':'America/Chicago','689':'America/New_York','701':'America/Chicago',
  '702':'America/Los_Angeles','703':'America/New_York','704':'America/New_York',
  '705':'America/Toronto','706':'America/New_York','707':'America/Los_Angeles',
  '708':'America/Chicago','709':'America/St_Johns','712':'America/Chicago',
  '713':'America/Chicago','714':'America/Los_Angeles','715':'America/Chicago',
  '716':'America/New_York','717':'America/New_York','718':'America/New_York',
  '719':'America/Denver','720':'America/Denver','724':'America/New_York',
  '725':'America/Los_Angeles','726':'America/Chicago','727':'America/New_York',
  '730':'America/Chicago','731':'America/Chicago','732':'America/New_York',
  '734':'America/Detroit','737':'America/Chicago','740':'America/New_York',
  '743':'America/New_York','747':'America/Los_Angeles','754':'America/New_York',
  '757':'America/New_York','760':'America/Los_Angeles','762':'America/New_York',
  '763':'America/Chicago','765':'America/Indiana/Indianapolis','769':'America/Chicago',
  '770':'America/New_York','772':'America/New_York','773':'America/Chicago',
  '774':'America/New_York','775':'America/Los_Angeles','779':'America/Chicago',
  '781':'America/New_York','785':'America/Chicago','786':'America/New_York',
  '787':'America/Puerto_Rico','801':'America/Denver','802':'America/New_York',
  '803':'America/New_York','804':'America/New_York','805':'America/Los_Angeles',
  '806':'America/Chicago','807':'America/Toronto','808':'Pacific/Honolulu',
  '810':'America/Detroit','812':'America/Indiana/Indianapolis','813':'America/New_York',
  '814':'America/New_York','815':'America/Chicago','816':'America/Chicago',
  '817':'America/Chicago','818':'America/Los_Angeles','820':'America/Los_Angeles',
  '825':'America/Edmonton','828':'America/New_York','830':'America/Chicago',
  '831':'America/Los_Angeles','832':'America/Chicago','838':'America/New_York',
  '843':'America/New_York','845':'America/New_York','847':'America/Chicago',
  '848':'America/New_York','850':'America/Chicago','854':'America/New_York',
  '856':'America/New_York','857':'America/New_York','858':'America/Los_Angeles',
  '859':'America/Kentucky/Louisville','860':'America/New_York','862':'America/New_York',
  '863':'America/New_York','864':'America/New_York','865':'America/New_York',
  '870':'America/Chicago','872':'America/Chicago','878':'America/New_York',
  '901':'America/Chicago','902':'America/Halifax','903':'America/Chicago',
  '904':'America/New_York','905':'America/Toronto','906':'America/Detroit',
  '907':'America/Anchorage','908':'America/New_York','909':'America/Los_Angeles',
  '910':'America/New_York','912':'America/New_York','913':'America/Chicago',
  '914':'America/New_York','915':'America/Denver','916':'America/Los_Angeles',
  '917':'America/New_York','918':'America/Chicago','919':'America/New_York',
  '920':'America/Chicago','925':'America/Los_Angeles','928':'America/Phoenix',
  '929':'America/New_York','930':'America/Indiana/Indianapolis','931':'America/Chicago',
  '934':'America/New_York','936':'America/Chicago','937':'America/New_York',
  '938':'America/Chicago','939':'America/Puerto_Rico','940':'America/Chicago',
  '941':'America/New_York','947':'America/Detroit','949':'America/Los_Angeles',
  '951':'America/Los_Angeles','952':'America/Chicago','954':'America/New_York',
  '956':'America/Chicago','959':'America/New_York','970':'America/Denver',
  '971':'America/Los_Angeles','972':'America/Chicago','973':'America/New_York',
  '975':'America/Chicago','978':'America/New_York','979':'America/Chicago',
  '980':'America/New_York','984':'America/New_York','985':'America/Chicago',
  '986':'America/Boise','989':'America/Detroit',
}

/**
 * Given a raw phone string, return an IANA timezone string or null.
 * Tries 4-digit, 3-digit, 2-digit country prefixes.
 * For +1 (US/Canada), falls back to area code lookup.
 */
function getTimezoneFromPhone(phone) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  // Try 4-digit prefix (special Caribbean/Pacific +1 numbers)
  if (COUNTRY_TIMEZONES[digits.slice(0, 4)]) return COUNTRY_TIMEZONES[digits.slice(0, 4)]
  // Try 3-digit prefix
  if (COUNTRY_TIMEZONES[digits.slice(0, 3)]) return COUNTRY_TIMEZONES[digits.slice(0, 3)]
  // Try 2-digit prefix
  if (COUNTRY_TIMEZONES[digits.slice(0, 2)]) return COUNTRY_TIMEZONES[digits.slice(0, 2)]
  // Try 1-digit (only '7' = Russia/Kazakhstan)
  if (digits.startsWith('7')) return COUNTRY_TIMEZONES['7']

  // +1 → US or Canada: use area code (digits[1..3])
  if (digits.startsWith('1') && digits.length >= 4) {
    const area = digits.slice(1, 4)
    return AREA_CODE_TIMEZONES[area] || 'America/New_York'
  }

  return null
}

/**
 * Given an IANA timezone, return { time, tz, color } where color is
 * 'green' | 'yellow' | 'red' based on the calling window.
 * Weekdays: 6pm–8pm. Weekends: 11am–8pm. Yellow = ±30 min buffer.
 */
function getLocalTimeInfo(timezone) {
  if (!timezone) return null
  try {
    const now = new Date()

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      weekday: 'short',
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
    if (totalMins >= start && totalMins <= end) {
      color = 'green'
    } else if (
      (totalMins >= start - buffer && totalMins < start) ||
      (totalMins > end && totalMins <= end + buffer)
    ) {
      color = 'yellow'
    } else {
      color = 'red'
    }

    const timeStr = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(now)

    const tzAbbr = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || ''

    return { time: timeStr, tz: tzAbbr, color }
  } catch {
    return null
  }
}

const DOT_COLORS = { green: '#2ECC71', yellow: '#F0A500', red: '#E74C3C' }

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
    return <td className="px-4 py-3 text-xs" style={{ color: '#444' }}>—</td>
  }

  return (
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: DOT_COLORS[info.color], boxShadow: `0 0 5px ${DOT_COLORS[info.color]}99` }} />
        <span className="text-xs" style={{ color: '#aaa' }}>{info.time}</span>
        <span className="text-xs" style={{ color: '#555' }}>{info.tz}</span>
      </div>
    </td>
  )
}

function NotesCell({ contactId, initialNote, onSave }) {
  const [value, setValue] = useState(initialNote || '')
  const debounceRef = useRef(null)
  const textareaRef = useRef(null)

  // Keep in sync if callLogs changes externally
  useEffect(() => { setValue(initialNote || '') }, [initialNote])

  // Auto-resize textarea height to content
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
    <td className="px-4 py-3" style={{ verticalAlign: 'top' }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder="Add note…"
        rows={1}
        className="text-xs rounded px-2 py-1 w-full resize-none focus:outline-none"
        style={{
          background:   'transparent',
          color:        '#aaa',
          border:       '1px solid transparent',
          minWidth:     '160px',
          lineHeight:   '1.5',
          overflow:     'hidden',
          transition:   'border-color 0.15s',
        }}
        onFocus={e  => { e.target.style.borderColor = '#B8935A44'; e.target.style.background = '#1a1a1a' }}
        onBlur={e   => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent' }}
      />
    </td>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCountryName(code) {
  if (!code) return '—'
  if (code.length > 2) return code
  return COUNTRY_CODES[code.toUpperCase()] || code
}

function getField(customFields, id) {
  return customFields?.find(f => f.id === id)?.value || '—'
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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Calls() {
  const [contacts,  setContacts]  = useState([])
  const [callLogs,  setCallLogs]  = useState({})
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filterTag,     setFilterTag]     = useState('all')
  const [filterCountry, setFilterCountry] = useState('all')
  const [filterInvest,  setFilterInvest]  = useState('all')
  const [sortBy,    setSortBy]    = useState('created')
  const [timeframe, setTimeframe] = useState('daily')
  const [perPage,   setPerPage]   = useState(10)
  const [page,      setPage]      = useState(1)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const res  = await fetch('/api/ghl-contacts')
      const data = await res.json()
      setContacts(data.contacts || [])

      const { data: logs } = await supabase.from('call_logs').select('*')
      const logsMap = {}
      logs?.forEach(log => { logsMap[log.ghl_contact_id] = log })
      setCallLogs(logsMap)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  async function saveNote(contactId, notes) {
    const existing = callLogs[contactId]
    const now = new Date().toISOString()
    if (existing) {
      await supabase.from('call_logs')
        .update({ notes, updated_at: now })
        .eq('ghl_contact_id', contactId)
    } else {
      await supabase.from('call_logs')
        .insert({ ghl_contact_id: contactId, notes })
    }
    setCallLogs(prev => ({
      ...prev,
      [contactId]: { ...prev[contactId], notes }
    }))
  }

  async function updateTag(contactId, tag) {
    const existing = callLogs[contactId]
    const now = new Date().toISOString()
    if (existing) {
      await supabase.from('call_logs')
        .update({ tag, last_contacted: now, updated_at: now })
        .eq('ghl_contact_id', contactId)
    } else {
      await supabase.from('call_logs')
        .insert({ ghl_contact_id: contactId, tag, last_contacted: now })
    }
    // Optimistic update — stats recalculate instantly from callLogs state
    setCallLogs(prev => ({
      ...prev,
      [contactId]: { ...prev[contactId], tag, last_contacted: now }
    }))
  }

  const tagColors = {
    uncalled:           '#555',
    'called once':      '#378ADD',
    'called twice':     '#F0A500',
    'called three times':'#E74C3C',
    'not interested':   '#888',
    'call back':        '#9B59B6',
    booked:             '#2ECC71',
  }

  const [selectedRow, setSelectedRow] = useState(null)

  function copyToClipboard(text) {
    if (!text || text === '—') return
    navigator.clipboard.writeText(text).catch(() => {})
  }

  /**
   * Returns true if this contact needs a call right now.
   * - uncalled → always needs call
   * - called once / called twice / call back → needs call if 24hrs have passed
   * - called three times / not interested / booked → never
   */
  function needsCall(tag, lastContacted) {
    if (tag === 'uncalled') return true
    if (['called three times', 'not interested', 'booked'].includes(tag)) return false
    if (['called once', 'called twice', 'call back'].includes(tag)) {
      if (!lastContacted) return true // tagged but no timestamp — treat as overdue
      const hoursSince = (Date.now() - new Date(lastContacted).getTime()) / 36e5
      return hoursSince >= 24
    }
    return false
  }

  const tags         = ['uncalled','called once','called twice','called three times','call back','not interested','booked']
  const calledTags   = ['called once','called twice','called three times','call back','not interested','booked']
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

  // All contacts in the selected timeframe (unfiltered) — used for stats
  const timeframeContacts = contacts.filter(c => new Date(c.dateAdded) >= startDate)

  const countries    = ['all', ...new Set(timeframeContacts.map(c => getCountryName(c.country)).filter(Boolean).sort())]
  const investOptions = ['all', ...new Set(timeframeContacts.map(c => getField(c.customFields, FIELD_IDS.invest)).filter(v => v !== '—').sort())]

  // Filtered + sorted contacts for the table
  const filtered = timeframeContacts
    .filter(c => {
      const tag = callLogs[c.id]?.tag || 'uncalled'
      if (filterTag     !== 'all' && tag !== filterTag) return false
      if (filterCountry !== 'all' && getCountryName(c.country) !== filterCountry) return false
      if (filterInvest  !== 'all' && getField(c.customFields, FIELD_IDS.invest) !== filterInvest) return false
      if (search) {
        const s = search.toLowerCase()
        return c.contactName?.toLowerCase().includes(s)
            || c.email?.toLowerCase().includes(s)
            || c.phone?.toLowerCase().includes(s)
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'created')       return new Date(b.dateAdded) - new Date(a.dateAdded)
      if (sortBy === 'name')          return (a.contactName || '').localeCompare(b.contactName || '')
      if (sortBy === 'country')       return getCountryName(a.country).localeCompare(getCountryName(b.country))
      if (sortBy === 'last_contacted') {
        return new Date(callLogs[b.id]?.last_contacted || 0) - new Date(callLogs[a.id]?.last_contacted || 0)
      }
      return 0
    })

  // ── Stats: current tag state of ALL timeframe contacts (not filtered, not events)
  //    This means un-tagging a contact immediately drops it from the count.
  const statTotal    = timeframeContacts.length
  const statCalled   = timeframeContacts.filter(c => calledTags.includes(callLogs[c.id]?.tag || 'uncalled')).length
  const statAnswered = timeframeContacts.filter(c => answeredTags.includes(callLogs[c.id]?.tag || 'uncalled')).length
  const statBooked   = timeframeContacts.filter(c => (callLogs[c.id]?.tag || 'uncalled') === 'booked').length

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage)

  const DumbbellIcon = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2"  y="10" width="3"  height="4" rx="1" fill="#B8935A"/>
      <rect x="19" y="10" width="3"  height="4" rx="1" fill="#B8935A"/>
      <rect x="5"  y="8"  width="2"  height="8" rx="1" fill="#B8935A"/>
      <rect x="17" y="8"  width="2"  height="8" rx="1" fill="#B8935A"/>
      <rect x="7"  y="11" width="10" height="2" rx="1" fill="#B8935A"/>
    </svg>
  )

  const TABLE_COLS = [
    { label: 'Name',             w: '140px' },
    { label: 'Created',          w: '160px' },
    { label: 'Phone',            w: '140px' },
    { label: 'Email',            w: '190px' },
    { label: 'Biggest Struggle', w: '220px' },
    { label: 'Bothered',         w: '80px'  },
    { label: 'Would Invest?',    w: '200px' },
    { label: 'Age',              w: '60px'  },
    { label: 'Country',          w: '120px' },
    { label: 'Local Time',       w: '130px' },
    { label: 'Last Contact',     w: '100px' },
    { label: 'Notes',           w: '180px' },
    { label: 'Tag',              w: '160px' },
  ]

  return (
    <div className="min-h-screen font-sans" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="border-b px-8 py-4 flex items-center"
        style={{ background: '#111', borderColor: '#222' }}>
        <div className="flex items-center gap-3">
          <DumbbellIcon size={28} />
          <div>
            <h1 className="font-bold tracking-widest text-lg" style={{ color: '#B8935A' }}>LARGE DUMBBELLS</h1>
            <p className="text-xs" style={{ color: '#444' }}>Calls Pipeline</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-screen-xl mx-auto">

        {/* Timeframe toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {['daily','weekly','monthly'].map(t => (
              <button key={t} onClick={() => { setTimeframe(t); setPage(1) }}
                className="text-xs px-3 py-1.5 rounded"
                style={{
                  background:  timeframe === t ? '#B8935A' : '#1a1a1a',
                  color:       timeframe === t ? '#000' : '#888',
                  border:      '1px solid',
                  borderColor: timeframe === t ? '#B8935A' : '#333',
                }}>
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs" style={{ color: '#444' }}>
            Showing contacts added {timeframe === 'daily' ? 'today' : timeframe === 'weekly' ? 'this week' : 'this month'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Leads', value: statTotal,    color: '#B8935A' },
            { label: 'Called',      value: statCalled,   color: '#378ADD' },
            { label: 'Answered',    value: statAnswered, color: '#9B59B6' },
            { label: 'Booked',      value: statBooked,   color: '#2ECC71' },
          ].map(stat => (
            <div key={stat.label} className="p-4 rounded-lg" style={{ background: '#111', border: '1px solid #222' }}>
              <p className="text-xs tracking-wider mb-2" style={{ color: '#555' }}>{stat.label.toUpperCase()}</p>
              <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name, email, phone..."
            className="text-sm px-3 py-2 rounded-lg flex-1 min-w-48 focus:outline-none"
            style={{ background: '#111', color: '#e0e0e0', border: '1px solid #333' }} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ background: '#111', color: '#888', border: '1px solid #333' }}>
            <option value="created">Sort: Newest</option>
            <option value="name">Sort: Name</option>
            <option value="country">Sort: Country</option>
            <option value="last_contacted">Sort: Last Contacted</option>
          </select>
          <select value={filterCountry} onChange={e => { setFilterCountry(e.target.value); setPage(1) }}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ background: '#111', color: '#888', border: '1px solid #333' }}>
            {countries.map(c => <option key={c} value={c}>{c === 'all' ? 'All Countries' : c}</option>)}
          </select>
          <select value={filterInvest} onChange={e => { setFilterInvest(e.target.value); setPage(1) }}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ background: '#111', color: '#888', border: '1px solid #333' }}>
            {investOptions.map(o => <option key={o} value={o}>{o === 'all' ? 'All Invest Answers' : o}</option>)}
          </select>
        </div>

        {/* Tag filter pills */}
        <div className="flex gap-1 flex-wrap mb-4">
          {['all', ...tags].map(t => (
            <button key={t} onClick={() => { setFilterTag(t); setPage(1) }}
              className="text-xs px-2 py-1 rounded"
              style={{
                background:  filterTag === t ? '#B8935A' : '#1a1a1a',
                color:       filterTag === t ? '#000' : '#888',
                border:      '1px solid',
                borderColor: filterTag === t ? '#B8935A' : '#333',
              }}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: '#555' }}>Loading contacts...</p>
        ) : (
          <>
            {/* Table */}
            <div className="rounded-lg overflow-auto" style={{ border: '1px solid #222' }}>
              <table className="text-sm" style={{ minWidth: '1740px', width: '100%' }}>
                <thead>
                  <tr style={{ background: '#111', borderBottom: '1px solid #222' }}>
                    {TABLE_COLS.map((h, idx) => (
                      <th key={h.label}
                        className="text-left px-4 py-3 text-xs font-semibold tracking-wider"
                        style={{
                          color: '#555', width: h.w, minWidth: h.w,
                          ...(idx === 0 ? {
                            position:    'sticky',
                            left:        0,
                            zIndex:      2,
                            background:  '#111',
                            borderRight: '1px solid #222',
                          } : {})
                        }}>
                        {h.label.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={TABLE_COLS.length} className="px-4 py-8 text-center text-sm" style={{ color: '#444' }}>
                        No contacts found for this timeframe
                      </td>
                    </tr>
                  )}
                  {paginated.map((contact, i) => {
                    const log        = callLogs[contact.id]
                    const tag        = log?.tag || 'uncalled'
                    const cf         = contact.customFields || []
                    const isSelected = selectedRow === contact.id
                    const rowBg      = isSelected ? '#1e1a12' : i % 2 === 0 ? '#0d0d0d' : '#111'
                    const urgent     = needsCall(tag, log?.last_contacted)
                    return (
                      <tr key={contact.id}
                        onClick={() => setSelectedRow(prev => prev === contact.id ? null : contact.id)}
                        style={{
                          background:   rowBg,
                          borderBottom: '1px solid #1a1a1a',
                          cursor:       'pointer',
                          outline:      isSelected ? '1px solid #B8935A55' : 'none',
                          outlineOffset: '-1px',
                        }}>

                        {/* Name — sticky left */}
                        <td className="px-4 py-3 font-medium"
                          style={{
                            position:    'sticky',
                            left:        0,
                            zIndex:      1,
                            background:  rowBg,
                            borderRight: '1px solid #222',
                          }}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{
                                background: urgent ? '#B8935A33' : '#B8935A22',
                                color:      '#B8935A',
                                border:     `1px solid ${urgent ? '#B8935A99' : '#B8935A44'}`,
                                boxShadow:  urgent ? '0 0 8px #B8935A55' : 'none',
                              }}>
                              {(contact.contactName || '?')[0].toUpperCase()}
                            </div>
                            <span style={{
                              color:      urgent ? '#B8935A' : '#666',
                              textShadow: urgent ? '0 0 12px #B8935A88' : 'none',
                              fontWeight: urgent ? 600 : 400,
                              whiteSpace: 'nowrap',
                              transition: 'all 0.2s',
                            }}>
                              {contact.contactName || '—'}
                            </span>
                          </div>
                        </td>

                        {/* Created */}
                        <td className="px-4 py-3 text-xs" style={{ color: '#888' }}>{formatCreated(contact.dateAdded)}</td>

                        {/* Phone + copy */}
                        <td className="px-4 py-3" style={{ color: '#aaa' }}>
                          <div className="flex items-center gap-1.5">
                            <span style={{ whiteSpace: 'nowrap' }}>{contact.phone || '—'}</span>
                            {contact.phone && (
                              <button
                                onClick={e => { e.stopPropagation(); copyToClipboard(contact.phone) }}
                                title="Copy phone"
                                style={{
                                  flexShrink: 0, color: '#555', background: 'transparent',
                                  border: '1px solid #333', borderRadius: '4px',
                                  padding: '1px 5px', fontSize: '11px', lineHeight: 1.4, cursor: 'pointer',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#B8935A'; e.currentTarget.style.borderColor = '#B8935A66' }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#555';    e.currentTarget.style.borderColor = '#333' }}>
                                ⎘
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Email + copy */}
                        <td className="px-4 py-3" style={{ color: '#aaa' }}>
                          <div className="flex items-center gap-1.5">
                            <span className="truncate block" style={{ maxWidth: '160px' }}>{contact.email || '—'}</span>
                            {contact.email && (
                              <button
                                onClick={e => { e.stopPropagation(); copyToClipboard(contact.email) }}
                                title="Copy email"
                                style={{
                                  flexShrink: 0, color: '#555', background: 'transparent',
                                  border: '1px solid #333', borderRadius: '4px',
                                  padding: '1px 5px', fontSize: '11px', lineHeight: 1.4, cursor: 'pointer',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#B8935A'; e.currentTarget.style.borderColor = '#B8935A66' }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#555';    e.currentTarget.style.borderColor = '#333' }}>
                                ⎘
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Biggest Struggle */}
                        <td className="px-4 py-3" style={{ color: '#aaa' }}>
                          <span style={{ whiteSpace: 'normal', lineHeight: '1.4' }}>{getField(cf, FIELD_IDS.struggle)}</span>
                        </td>

                        {/* Bothered */}
                        <td className="px-4 py-3 text-center" style={{ color: '#aaa' }}>{getField(cf, FIELD_IDS.bothered)}</td>

                        {/* Would Invest? */}
                        <td className="px-4 py-3" style={{ color: '#aaa' }}>
                          <span style={{ whiteSpace: 'normal', lineHeight: '1.4' }}>{getField(cf, FIELD_IDS.invest)}</span>
                        </td>

                        {/* Age */}
                        <td className="px-4 py-3 text-center" style={{ color: '#aaa' }}>{getField(cf, FIELD_IDS.age)}</td>

                        {/* Country */}
                        <td className="px-4 py-3" style={{ color: '#aaa' }}>{getCountryName(contact.country)}</td>

                        {/* Local Time */}
                        <LocalTimeCell phone={contact.phone} />

                        {/* Last Contact */}
                        <td className="px-4 py-3 text-xs" style={{ color: '#666' }}>{timeAgo(log?.last_contacted)}</td>

                        {/* Notes */}
                        <NotesCell
                          contactId={contact.id}
                          initialNote={log?.notes}
                          onSave={saveNote}
                        />

                        {/* Tag */}
                        <td className="px-4 py-3">
                          <select value={tag}
                            onChange={e => { e.stopPropagation(); updateTag(contact.id, e.target.value) }}
                            className="text-xs px-2 py-1 rounded w-full"
                            style={{
                              background: `${tagColors[tag]}22`,
                              color:       tagColors[tag],
                              border:      `1px solid ${tagColors[tag]}44`,
                            }}>
                            {tags.map(t => (
                              <option key={t} value={t} style={{ background: '#1a1a1a', color: tagColors[t] }}>{t}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#555' }}>Rows per page:</span>
                {[10, 20, 50].map(n => (
                  <button key={n} onClick={() => { setPerPage(n); setPage(1) }}
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      background:  perPage === n ? '#B8935A' : '#1a1a1a',
                      color:       perPage === n ? '#000' : '#888',
                      border:      '1px solid',
                      borderColor: perPage === n ? '#B8935A' : '#333',
                    }}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#555' }}>
                  {filtered.length === 0 ? '0' : `${(page - 1) * perPage + 1}–${Math.min(page * perPage, filtered.length)}`} of {filtered.length}
                </span>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="text-xs px-3 py-1 rounded"
                  style={{ background: '#1a1a1a', color: page === 1 ? '#333' : '#888', border: '1px solid #333' }}>←</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
                  className="text-xs px-3 py-1 rounded"
                  style={{ background: '#1a1a1a', color: page === totalPages ? '#333' : '#888', border: '1px solid #333' }}>→</button>
              </div>
            </div>

            {/* Call window legend */}
            <div className="flex items-center gap-4 mt-3">
              <span className="text-xs" style={{ color: '#444' }}>Call window:</span>
              {[
                { color: '#2ECC71', label: 'Good to call (6–8pm · wknd 11am–8pm)' },
                { color: '#F0A500', label: 'Within 30 min' },
                { color: '#E74C3C', label: 'Outside window' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: color, boxShadow: `0 0 5px ${color}88` }} />
                  <span className="text-xs" style={{ color: '#555' }}>{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}