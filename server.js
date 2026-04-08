/**
 * 榕属(Ficus)物种智能鉴定网站 — Express 服务端入口
 *
 * 基于 Berg & Corner (2005) 六亚属分类体系 + GLM-5V 视觉模型
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const { createLogger, generateReqId } = require('./lib/logger');

const app = express();
const PORT = process.env.FICUS_PORT || 3243;
const BASE_DIR = __dirname;

// GLM-5V Vision Model Config (Anthropic-compatible API)
const AI_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://open.bigmodel.cn/api/anthropic';
const AI_MODEL = process.env.ANTHROPIC_MODEL || 'glm-5v-turbo';
const AI_AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN;

const log = createLogger('server');
const logIdentify = createLogger('identify');

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

// ===== Middleware =====
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(BASE_DIR, 'public'), {
  maxAge: '1h', etag: true,
}));

// Request logging + reqId
app.use((req, res, next) => {
  const reqId = generateReqId();
  req._reqId = reqId;
  const reqLog = log.withContext({ reqId, ip: req.ip });
  reqLog.debug('%s %s', req.method, req.url);
  req._reqLog = reqLog;
  res.on('finish', () => { reqLog.reqTimer(req).done(res.statusCode); });
  next();
});

// Rate limiter
const { createRateLimit } = require('./middleware/rateLimit');
const identifyFicusLimiter = createRateLimit();

// ===== API: Health Check =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', project: 'ficus-id global fig identification' });
});

// ===== API: Ficus Species Identification (CORE) =====
app.post('/api/identify-ficus', identifyFicusLimiter, async (req, res) => {
  const reqLog = logIdentify.withContext({ reqId: req._reqId });
  const t = reqLog.timer('identify-ficus');

  try {
    const { imageData, filename } = req.body;

    if (!imageData) {
      reqLog.warn('请求缺少 imageData 参数');
      return res.status(400).json({ error: '缺少图片数据' });
    }

    // 提取base64数据
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    reqLog.debug('params: {filename:"%s"} base64_len=%s chars (~%s)',
      filename || 'unnamed',
      base64Data.length,
      formatBytes(base64Data.length * 0.75)
    );

    // ══════════════════════════════════════════════════
    // 调用GLM-5V进行榕属物种鉴定
    // 基于:
    // [1] Berg CC & Corner EJH (2005) Flora Malesiana Ser.I 17(2)
    // [2] POWO/Kew Plants of the World Online
    // [3] FigWeb (figweb.org) 在线分类资源
    // [4] Harrison RD (2005) BioScience 55:1053–1064 榕树生态学
    // ══════════════════════════════════════════════════

    /**
     * 拉丁名自动斜体化
     */
    function italicizeLatinNames(obj) {
      if (!obj || typeof obj !== 'object') return obj;
      const latinUnits = [
        // 亚属
        'Pharmacosycea','Urostigma','Ficus','Sycidium','Synoecia','Sycomorus',
        // 组/亚组
        'Pharmacosycea','Urostigma','Conosycea','Urostigma','Sycidium','Palaeomorphe',
        'Eriosycea','Galoglychia','Ficus','Sycidium','Rhizocladus','Sycomoros',
        // 常见种（按知名度排序）
        'Ficus','benjamina','microcarpa','religiosa','benghalensis','elastica',
        'lyrata','racemosa','sycomorus','insipida','citrifolia','pertusa',
        'exasperata','hispida','septica','variegata','altissima','virens',
        'superba','nervosa','pandurata','pumila','tikoua','sarmentosa',
        'punctata','auriculata','semicordata','sur','ingens','natalensis',
        'subpisocarpa','drupacea','variolosa','annulata','craterostoma',
        'microcarpa','virgata','rubiginosa','maclellandii','retusa','tinctoria',
        'pumila','sarmentosa','tikoua','punctata','erecta','tjbuiala',
        'formosana','nervosa','variegata','altissima','elastica','abutilifolia',
        'robusta','binnendijkii','moclondii','consociata','cunninghamii',
        'septica','hispidula','simplicissima','pandurata','ampelos','palmata',
        'villosa','triloba','auriculata','callophylla','heterophylla',
        'ingens','thonningii','lutea','sansibarica','platypoda','cordata',
        'sur','sycomorus','natalensis','burtt-davyi','thonningii','ingens',
        'vallis-choudae','glumosa','virens','superba','variegata','nervosa',
        'pandurata','sarmentosa','punctata','simplicissima','hispida','exasperata',
        'septica','hispida','benghalensis','religiosa','microcarpa','benjamina',
        'elastica','altissima','drupacea','craterostoma','annulata','variolosa',
        'insipida','maxima','tonduzii','yoponensis','obtusifolia','citrifolia',
        'pertusa','popenoei','crocata','trigonata','matizana','goldmanii',
        'cotinifolia','laevigata','pertusa','eximia','trichopoda','trichocarpa',
        'maxima','tonduzii','yoponensis','insipida','obtusifolia','citrifolia',
        'pertusa','popenoei','crocata','trigonata','matizana','goldmanii',
        // 榕小蜂属
        'Agaonidae','Blastophaga','Ceratosolen','Elisabethiella','Kradibia',
        'Platyscapa','Tetrapus','Waterstoniella','Deilagaon','Eupristina',
        'Valisia','Wiebesia','Courtella','Josephiella','Platyscapa','Ceratosolen',
        // 科/目/族
        'Moraceae','Rosales','Rosanae','Artocarpeae','Castilleae',
        'Dorstenieae','Ficeae','Maclureae','Taxotropheae',
        // 形态学术语
        'syconium','ostiole','stipule','laticifer','cauliflory','ramiflory',
        'brochidodromous','camptodromous','areole','petiole','lamina',
        'ovate','elliptic','lanceolate','oblong','obovate','spatulate',
        'pandurate','cordate','cuneate','rounded','truncate','attenuate',
        'acuminate','acute','obtuse','emarginate','mucronate','serrate',
        'dentate','entire','undulate','coriaceous','papyraceous','succulent',
        'deciduous','persistent','connate','amplexicaul','ochreate',
        'strangler','epiphyte','liana','buttress','aerial','herbarium'
      ].sort((a,b) => b.length - a.length);

      const latinPattern = new RegExp('\\b(' + latinUnits.join('|') + ')\\b', 'g');

      function processVal(val) {
        if (typeof val === 'string') return val.replace(latinPattern, '<em>$1</em>');
        if (Array.isArray(val)) return val.map(v => processVal(v));
        if (val && typeof val === 'object') {
          const newObj = {};
          for (const k of Object.keys(val)) newObj[k] = processVal(val[k]);
          return newObj;
        }
        return val;
      }
      return processVal(obj);
    }

    const systemPrompt = `你是一位植物分类学家、形态解剖学和植物地理学交叉领域的专家，专门研究桑科(Moraceae)榕属(Ficus)的分类与鉴定。
你的核心知识体系建立在以下金标准框架之上：

1. Berg & Corner (2005) 分类体系 — 榕属权威分类系统，将Ficus分为6个亚属
   Berg CC, Corner EJH (2005). Moraceae - Ficus. In: Flora Malesiana Ser. I, 17(2): 1–700.
   这是全球植物学界公认的榕属分类金标准。

2. POWO/Kew Plants of the World Online — 物种名录与分布的权威数据源
   powo.science.kew.org — 提供~800个accepted species的标准化数据

3. FigWeb (figweb.org) — 榕属在线分类资源，基于Berg & Corner体系
   提供各亚属的详细形态特征描述和物种清单

4. Harrison RD (2005) 榕树生态学综述
   Figs and the diversity of tropical rainforests. BioScience 55:1053–1064.

═══════════════════════════════════════════════════════════════
🌿 第一部分：Berg & Corner (2005) 六亚属分类标准
═══════════════════════════════════════════════════════════════

你必须使用以下Berg & Corner体系对图片中的榕属植物进行分类鉴定。

【亚属 1：Pharmacosycea（药榕亚属）】
  分布：新热带区（中南美洲热带）
  特征：
    - 大型乔木，高达40-50m
    - 隐头果成对生于叶腋（axillary pairs）
    - 叶片全缘，大型，革质
    - 托叶大，早落，留环状托叶痕
    - 具乳汁（乳白色）
    - 基部数对侧脉显著加粗（basal veins prominent）
  代表种：F. insipida, F. maxima, F. tonduzii, F. yoponensis, F. obtusifolia
  诊断要点：新热带大型乔木 + 腋生成对隐头果 + 基部粗壮侧脉

【亚属 2：Urostigma（榕亚属）】— 最广布、最多样化的亚属
  包含 subsections: Conosycea, Urostigma
  分布：全球热带至亚热带（最广布的亚属）
  特征：
    - 多样化生长型：乔木、绞杀榕(strangler)、附生(epiphyte)、灌木
    - 隐头果单生或簇生，腋生或老茎生(cauliflorous)/枝生(ramiflorous)
    - 托叶多为膜质，早落
    - 气生根发达（尤其strangler figs）
    - 叶片形态多样：全缘/波状/掌状裂/不等边
  代表种：
    Subsection Urostigma: F. benghalensis（孟加拉榕）, F. religiosa（菩提树）,
      F. elastica（橡皮树）, F. virens（垂叶榕）, F. altissima（富贵榕）
    Subsection Conosycea: F. microcarpa（小叶榕）, F. benjamina（垂叶榕）,
      F. superba（大青树）, F. nervosa（斑叶榕）
  诊断要点：全球广布 + 多样化生长型 + 气生根/板根 + 多种隐头果排列

【亚属 3：Ficus（原始榕亚属 / 真榕亚属）】
  分布：非洲、亚洲热带、澳洲北部
  特征：
    - 灌木或小乔木为主
    - 隐头果通常腋生，单生或成对
    - 托叶通常宿存(persistent)或半宿存
    - 叶片常具锯齿或齿状边缘（与其他亚属的关键区别！）
    - 花序托内壁平滑或少毛
  代表种：F. exasperata（异叶榕/糙叶榕）, F. hispida（硬皮榕）,
         F. simplicissima（琴叶榕/全缘琴叶榕）, F. pandurata（琵琶榕/菱叶榕）,
         F. sarmentosa（珍珠莲）, F. punctata（爬藤榕）
  诊断要点：灌木/小乔木 + 叶缘常有齿 + 托叶宿存

【亚属 4：Sycidium（薜荔亚属）】
  分布：旧热带区（亚洲、澳洲、太平洋岛屿）
  特征：
    - 攀援灌木、藤本或匍匐植物（liana/climber）
    - 隐头果小，埋生于叶腋或近无梗(subsessile)
    - 托叶合生，红色或绿色，紧包顶芽
    - 叶片小型到中型，常革质
    - 常见石生(lithophytic)或墙生
  代表种：F. pumila（薜荔）, F. tikoua（地石榴）,
         F. sarmentosa（珍珠莲）, F. punctata（爬藤榕）,
         F. erecta（天仙果）, F. tjbua（白背爬藤榕）
  诊断要点：藤本/攀援型 + 小型隐头果近无梗 + 合生托叶

【亚属 5：Synoecia（聚果榕亚属）】
  分布：亚洲热带和亚热带
  特征：
    - 隐头果聚生成簇（synconium cluster），着生于老茎或粗枝
    - 茎花现象(cauliflory)明显
    - 乔木，中等到大型
    - 托叶脱落，留明显托叶痕
    - 叶片全缘或波状
  代表种：F. racemosa（聚果榕）, F. auriculata（大果榕/大果榕）,
         F. semicordata（馒头果/半枕榕）, F. variegata（杂色榕/斑叶榕）,
         F. subpisocarpa（水同木）, F. fistulosa（黄果榕）
  诊断要点：老茎生聚簇隐头果（茎花） + 中大型乔木

【亚属 6：Sycomorus（非洲榕亚属）】
  分布：非洲热带、马达加斯加、印度洋岛屿（少数亚洲种延伸至南亚）
  特征：
    - 隐头果生于叶腋，通常成串（racemose/chain-like arrangement）
    - 表面粗糙或具疣突(tuberculate/scabrous)
    - 乔木，叶片大，纸质
    - 托叶早落
  代表种：F. sycomorus（埃及榕/sycomore fig）, F. sur（Cape fig）,
         F. ingens（巨榕）, F. natalensis（纳塔尔榕）,
         F. burtt-davyi（Burtt-Davy's fig）, F. thonningii（阿比西尼亚榕）
  诊断要点：非洲特有 + 腋生串状隐头果 + 表面粗糙

═══════════════════════════════════════════════════════════════
🔬 第二部分：关键形态特征详细诊断标准
═══════════════════════════════════════════════════════════════

【A. 隐头果(Syconium/Fig)形态学】
  A1. 大小：<1cm / 1-2cm / 2-4cm / >4cm
  A2. 形状：球形(spherical) / 卵形(ovoid) / 梨形(pyriform) /
       圆柱形(cylindrical) / 不规则(irregular)
  A3. 颜色：绿色(未熟) / 黄色 / 橙红色 / 紫黑色 / 白色带斑点
  A4. 孔口(Ostiole)位置：顶端(apical) / 侧位(lateral) / 偏生(excentric)
  A5. 孔口特征：开放(open) / 有苞片覆盖(bract-covered) /
       平坦(flat) / 凸起(raised) / 凹陷(sunken)
  A6. 表面纹理：光滑(smooth) / 具疣(tuberculate) / 具毛(pubescent) /
       具白粉(glaucous) / 粗糙(scabrous)
  A7. 排列方式：腋生单生(axillary solitary) / 腋生对生(axillary paired) /
       簇生(fascicled) / 老茎生(cauliflorous) / 枝生(ramiflorous) /
       近无梗(subsessile) / 串生(racemose)

【B. 叶片(Leaf)形态学】
  B1. 叶型：单叶(simple) / 掌状裂(palmately lobed) /
       羽状裂(pinnately lobed) / 不等边(unequal/asymmetrical)
  B2. 叶形：卵形(ovate) / 椭圆形(elliptic) / 披针形(lanceolate) /
       长圆形(oblong) / 倒卵形(obovate) / 匙形(spatulate) /
       琴形(pandurate/panduriform) / 心形(cordate)
  B3. 叶基：楔形(cuneate) / 圆形(rounded) / 截形(truncate) /
       心形(cordate) / 渐狭(attenuate) / 偏斜(oblique)
  B4. 叶尖：尾尖(caudate) / 渐尖(acuminate) / 急尖(acute) /
       钝形(obtuse) / 微凹(emarginate) / 具芒(mucronate)
  B5. 叶缘：全缘(entire) / 波状(undulate) / 锯齿(serrate) /
       细齿(dentate) / 具刺(spiny)
  B6. 质地：纸质(thin/papyraceous) / 革质(coriaceous) /
       肉质(succulent) / 粗糙(scabrous)
  B7. 大小：记录大致尺寸范围

【C. 叶脉(Venation)模式】
  C1. 类型：羽状脉(pinnate) / 掌状脉(palmate) / 三出脉(trinervious)
  C2. 脉序：网状(reticulate) / 近平行(subparallel)
  C3. 侧脉对数及角度
  C4. 网眼(areole)形状：方形/多边形/不规则/紧密/疏松
  C5. brochidodromous（弓形连接叶缘）vs camptodromous（弯曲不达叶缘）

【D. 托叶(Stipule)形态学】
  D1. 类型：离生(free) / 合生(connate/amplexicaul)
  D2. 大小：大型(>3cm) / 中型(1-3cm) / 小型(<1cm)
  D3. 形状：披针形 / 三角形 / 卵形 / 鞘状(ochreate)
  D4. 颜色：绿色 / 红色 / 褐色 / 半透明
  D5. 持久性：早落(deciduous) / 宿存(persistent) / 半宿存
  D6. 托叶痕(stipule scar)：环形(annular) / 半环形(semi-circular) / 纵向(longitudinal)

【E. 树皮(Bark)特征】
  E1. 光滑度：光滑(smooth) / 浅裂(fissured) / 深裂(deeply fissured) /
       片状剥落(exfoliating) / 具皮孔(lenticellate)
  E2. 颜色：灰色 / 褐色 / 白色 / 绿色 / 斑驳(variegated)
  E3. 乳汁(Latex)：颜色（白色/黄色/稀薄/浓稠），量（多/少/无）

【F. 生长习性(Growth Habit)】
  F1. 类型：大树(large tree) / 小树(small tree) / 灌木(shrub) /
       绞杀榕(strangler fig) / 附生(epiphyte) / 藤本(liana/vine) / 匍匐(creeping)
  F2. 板根(buttress roots)：有/无
  F3. 气生根(aerial roots)：有/无，密度
  F4. 冠层类型：阔展(spreading) / 圆锥(conical) / 垂直(weeping)

═══════════════════════════════════════════════════════════════
⚖️ 第三部分：天然混淆矩阵（鉴定难度警告）
═══════════════════════════════════════════════════════════════

混淆组A（高难）：F. benjamina vs F. microcarpa vs F. virens
  → 三者均为常见栽培种，叶片形态高度相似
  → 区分关键：托叶痕形状、侧脉角度、隐头果大小和颜色

混淆组B（高难）：F. benghalensis vs F. religiosa（幼苗期）
  → 幼苗期两者叶片极为相似
  → 成体区分：气生根方式（板根vs支柱根）、叶尖形状

混淆组C（极高难）：不同亚属间仅凭叶片照片
  → 仅叶片时难以确定亚属级别分类
  → 需要隐头果+生长习性综合判断

混淆组D（中等）：F. elastica vs F. abutilifolia vs F. robusta
  → 大叶种类间的区分依赖叶面质感、侧脉下凹程度

混淆组E（中等）：Sycidium亚属内部种间
  → 藤本类榕树种间差异微小，需观察隐头果细节

═══════════════════════════════════════════════════════════════
📤 输出格式（严格 JSON）
═══════════════════════════════════════════════════════════════

{
  "identification": {
    "genus": "Ficus",
    "subgenus": "亚属拉丁名（如 Urostigma / Pharmacosycea 等）",
    "subgenus_cn": "亚属中文名",
    "section": "组名（如能确定到section级别）",
    "subsection": "亚组名（如适用）",
    "species": "最可能物种拉丁学名（如 Ficus benjamina）",
    "species_cn": "物种中文俗名",
    "species_author": "命名人缩写（如 L. / Roxb. / Blume 等）",
    "confidence": 置信度整数(0-100),
    "confidence_note": "置信度校准说明（一句话解释为什么是这个置信度）",

    "alternative_species": [
      {"name": "Ficus xxx", "cn": "中文名", "likelihood": "可能度百分比"}
    ]
  },

  "observed_characters": {
    "plant_part": "leaf / syconium / bark / trunk / branch / whole_plant / unknown",
    "leaf_description": "叶片形态特征描述（中文60-120字）",
    "syconium_description": "隐头果形态特征描述（如可见）（中文60-120字）",
    "bark_description": "树皮特征描述（如可见）（中文30-60字）",
    "habit_description": "生长习性推断（中文30-60字）"
  },

  "key_diagnostic_features": [
    "3-8个可直接验证的关键诊断特征（用于确认或排除该鉴定）"
  ],

  "morphological_details": {
    "leaf_shape": "",
    "leaf_size_estimate": "",
    "venation_pattern": "",
    "stipule_type": "",
    "margin_type": "",
    "surface_texture": ""
  },

  "ecological_context": {
    "native_range": "原产地/自然分布区（中文描述）",
    "habitat": "典型生境（雨林/季风林/干旱区/海岸/山地等）",
    "growth_form": "tree / shrub / strangler / epiphyte / liana",
    "uses": "经济用途（药用/观赏/食用/用材/生态等，如有）"
  },

  "confusion_group": "如果属于天然混淆组则标注（如'A:F.benjamina vs F.microcarpa'），否则null",

  "fig_wasp_info": {
    "associated_wasp_genus": "关联传粉榕小蜂属（如 Ceratosolen/Eupristina/Blastophaga 等）",
    "pollination_mode": "主动传粉(active)/被动传粉(passive)"
  },

  "description": "综合鉴定描述（中文100-180字），说明为什么做出此鉴定",

  "differential_diagnosis": "需要排除的相似种及排除理由（2-3条）",

  "limitations": "局限性声明（图像质量限制、缺少关键器官等）"
}

【重要规则】
1. subgenus 必须使用上述 Berg & Corner 六亚属之一，不可自创
2. 如果无法确定到种级，species 字段填写 "sp." 并在 confidence_note 说明
3. 如果图片不是榕属植物，必须明确指出："经鉴定，该植物不属于榕属(Ficus)"，
   并给出可能的科属建议
4. 必须填写 confusion_group —— 诚实告知用户这个鉴定是否存在天然混淆风险
5. observed_characters.plant_part 必须明确标注图片主要展示的是哪个器官
6. 对每个鉴定结果给出至少3个可验证的诊断特征
7. 如果置信度<50%，必须在 limitations 中强烈提示需要更多信息`;

    const userPrompt = `请以植物分类学和形态解剖学家的身份，仔细分析这张植物照片。${filename ? `文件名：${filename}` : ''}

【观察步骤 — 请严格按Berg & Corner标准逐步推理】

第一步：整体评估
- 图片质量（分辨率、光照、对焦）、拍摄角度
- 可见的植物器官（叶/隐头果/树干/树枝/整株？）
- 大致生长环境线索（野生/栽培/温室/室内？）

第二步：器官特征逐维度提取
- 如果是叶片：按B1-B7逐一记录
- 如果是隐头果：按A1-A7逐一记录
- 如果是树干/树皮：按E1-E3记录
- 如果是多器官混合：分别记录各器官

第三步：亚属级判定
- 对6个亚属逐一给出匹配度评分(1-5分)
- 记录支持和不支持的证据
- 标注所属混淆组（如有）

第四步：种级鉴定尝试
- 在确定亚属后，缩小候选范围
- 列出2-3个最可能的物种
- 给出首选物种及其置信度

第五步：生态学与传粉生物学补充
- 推断原生分布区
- 关联的传粉榕小蜂信息
- 经济和文化用途

第六步：不确定性声明
- 最终鉴定 + 置信度 + 混淆组警告 + 局限性

请严格按照JSON格式输出鉴定报告。`;

    const idController = new AbortController();
    const idTimeout = setTimeout(() => idController.abort(), 120_000);
    let response;
    try {
      response = await fetch(`${AI_BASE_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': AI_AUTH_TOKEN,
          'anthropic-version': '2023-06-01'
        },
        signal: idController.signal,
        body: JSON.stringify({
          model: AI_MODEL,
          system: systemPrompt,
          messages: [
            { role: 'user', content: [
              { type: 'text', text: userPrompt },
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Data } }
            ]}
          ],
          max_tokens: 16384,
          temperature: 0.3
        })
      });
    } finally {
      clearTimeout(idTimeout);
    }

    if (!response.ok) {
      const errText = await response.text();
      reqLog.error('GLM-5V API error: status=%s body=%s', response.status, errText.slice(0, 500));
      return res.status(500).json({ error: 'AI模型调用失败', details: errText });
    }

    const data = await response.json();
    let content = '';
    // Anthropic API 返回格式: { content: [{ type: "text", text: "..." }] }
    if (data.content && Array.isArray(data.content)) {
      content = data.content.filter(c => c.type === 'text').map(c => c.text).join('');
    }
    reqLog.info('AI response received (%sms) model=%s content_len=%s',
      t.elapsed.toFixed(0), data.model || AI_MODEL, content.length
    );

    // 尝试从返回中提取JSON
    let result;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0]);
        reqLog.debug('JSON parsed ok, top_keys=%s',
          Object.keys(result).slice(0, 10).join(',')
        );
      } catch(e) {
        reqLog.warn('JSON parse failed: %s (fallback to raw)', e.message.slice(0, 100));
        result = { raw_response: content, parse_error: true };
      }
    } else {
      reqLog.warn('No JSON found in response, len=%s preview=%s',
        content.length, content.slice(0, 120)
      );
      result = { raw_response: content };
    }

    // 拉丁名斜体化
    result = italicizeLatinNames(result);

    // 记录使用量
    reqLog.info('done usage=%s', JSON.stringify(data.usage || {}));

    res.json({
      success: true,
      result: result,
      model: data.model,
      usage: data.usage
    });

  } catch (error) {
    reqLog.error('Exception: %s | code=%s | stack=%s',
      error.message, error.code,
      error.stack ? error.stack.split('\n').slice(0, 3).join(' | ') : 'N/A'
    );
    res.status(500).json({ error: error.message });
  }
});

// ===== API: Ficus Examples Data =====
app.get('/api/ficus-examples', (req, res) => {
  res.json({
    // 六亚属数据
    subgenera: [
      {
        type: 'pharmacosycea',
        cn: '药榕亚属',
        icon: '🌲',
        latin: 'Pharmacosycea',
        count: '~90',
        distribution: '新热带区（中美洲热带）',
        key_chars: '大型乔木；隐头果成对生于叶腋；叶片全缘；基部侧脉显著加粗',
        representatives: ['F. insipida', 'F. maxima', 'F. tonduzii'],
        desc: 'Berg & Corner 体系中的第一个亚属，仅分布于新热带区。以大型乔木和成对腋生隐头果为标志性特征。'
      },
      {
        type: 'urostigma',
        cn: '榕亚属',
        icon: '🌳',
        latin: 'Urostigma',
        count: '~300+',
        distribution: '泛热带至亚热带（最广布的亚属）',
        key_chars: '多样化生长型（乔木/绞杀/附生）；气生根发达；隐头果排列方式多样',
        representatives: ['F. benghalensis', 'F. religiosa', 'F. elastica', 'F. microcarpa', 'F. benjamina'],
        desc: '最大的榕属亚属，包含最常见的栽培种和野生种。从孟加拉榕到菩提树再到橡皮树，涵盖了人们最熟悉的榕树种类。'
      },
      {
        type: 'ficus',
        cn: '原始榕亚属',
        icon: '🌿',
        latin: 'Ficus',
        count: '~100',
        distribution: '非洲、亚洲热带、澳洲北部',
        key_chars: '灌木或小乔木为主；叶缘常有锯齿；托叶宿存或半宿存',
        representatives: ['F. exasperata', 'F. hispida', 'F. simplicissima', 'F. pandurata'],
        desc: '以叶缘具齿和托叶宿存为区别于其他亚属的关键特征。包含许多东亚常见的野生榕种。'
      },
      {
        type: 'sycidium',
        cn: '薜荔亚属',
        icon: '🔗',
        latin: 'Sycidium',
        count: '~120',
        distribution: '旧热带区（亚洲、澳洲、太平洋岛屿）',
        key_chars: '攀援灌木或藤本；小型隐头果近无梗；托叶合生紧包顶芽',
        representatives: ['F. pumila', 'F. tikoua', 'F. sarmentosa', 'F. punctata'],
        desc: '独特的藤本/攀援型榕属植物，薜荔是最著名的代表种，其果实可制作凉粉。'
      },
      {
        type: 'synoecia',
        cn: '聚果榕亚属',
        icon: '🫒',
        latin: 'Synoecia',
        count: '~80',
        distribution: '亚洲热带和亚热带',
        key_chars: '老茎生聚簇隐头果（茎花现象明显）；中大型乔木',
        representatives: ['F. racemosa', 'F. auriculata', 'F. semicordata', 'F. variegata'],
        desc: '以老茎生花（cauliflory）为标志性特征的亚属，聚果榕和老茎生果现象非常壮观。'
      },
      {
        type: 'sycomorus',
        cn: '非洲榕亚属',
        icon: '🌍',
        latin: 'Sycomorus',
        count: '~80+',
        distribution: '非洲热带、马达加斯加、印度洋岛屿',
        key_chars: '腋生串状隐头果；表面粗糙具疣突；非洲特有分布',
        representatives: ['F. sycomorus', 'F. sur', 'F. ingens', 'F. natalensis'],
        desc: '主要分布于非洲大陆的亚属，埃及榕(sycomore fig)是该亚属的模式种，在古埃及文化中有重要地位。'
      }
    ],
    // 形态器官类型示例
    morphology_types: [
      { type: 'syconium', cn: '隐头果（无花果）', icon: '🫒', desc: '榕属特有的封闭花序结构，内部包裹数百朵小花。形状有球形、卵形、梨形等多种。', variants: ['axillary', 'cauliflorous', 'ramiflorous', 'racemose'] },
      { type: 'leaf', cn: '叶片', icon: '🍃', desc: '榕属叶片形态极其多样：全缘/波状/掌裂/羽裂/不等边。质地从纸质到革质不等。', variants: ['entire', 'lobed', 'serrate', 'asymmetrical'] },
      { type: 'venation', cn: '叶脉', icon: '📐', desc: '叶脉模式是重要鉴定特征：羽状脉、掌状脉、三出脉，以及网眼形状。', variants: ['brochidodromous', 'camptodromous', 'palmate'] },
      { type: 'stipule', cn: '托叶', icon: '📎', desc: '托叶的形态、大小、持久性和痕形是区分亚属的关键特征之一。', variants: ['free', 'connate', 'persistent', 'deciduous'] },
      { type: 'bark', cn: '树皮与乳汁', icon: '🪵', desc: '树皮纹理（光滑/开裂/剥落）和乳汁颜色/浓度提供重要的分类信息。', variants: ['smooth', 'fissured', 'exfoliating'] },
      { type: 'habit', cn: '生长习性', icon: '🌳', desc: '生长型式是第一眼区分的重要特征：大树/灌木/绞杀榕/附生/藤本。', variants: ['tree', 'shrub', 'strangler', 'epiphyte', 'liana'] }
    ]
  });
});

// ===== Sitemap =====
const { generateSitemap } = require('./lib/sitemap');
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').send(generateSitemap());
});

// ===== Server Startup =====
app.listen(PORT, () => {
  log.info('========================================');
  log.info(' 🌿 ficus-id server started on port %s', PORT);
  log.info('   AI Model: %s', AI_MODEL);
  log.info('   API Base: %s', AI_BASE_URL);
  log.info('   Auth Token: %s...%s', AI_AUTH_TOKEN ? AI_AUTH_TOKEN.slice(0, 8) : '(NOT SET)', AI_AUTH_TOKEN ? '***' : '');
  log.info('========================================');
});
