import fs from 'node:fs';
import path from 'node:path';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.resolve(relativePath), 'utf8'));
const writeJson = (relativePath, value) => fs.writeFileSync(
    path.resolve(relativePath),
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8'
);

const GRADES = Object.freeze(['HOANG', 'HUYEN', 'DIA', 'THIEN', 'THANH', 'THAN']);
const GRADE_LABELS = Object.freeze({
    HOANG: 'Hoàng phẩm', HUYEN: 'Huyền phẩm', DIA: 'Địa phẩm',
    THIEN: 'Thiên phẩm', THANH: 'Thánh phẩm', THAN: 'Thần phẩm'
});
const ELEMENT_LABELS = Object.freeze({
    FIRE: 'Hỏa', WOOD: 'Mộc', EARTH: 'Thổ', WATER: 'Thủy', METAL: 'Kim',
    LIGHTNING: 'Lôi', ICE: 'Băng', DARK: 'Bóng Tối', CHAOS: 'Hỗn Độn'
});
const NAME_SUFFIXES = Object.freeze({
    CULTIVATION_ART: ['Nhập Môn Quyết', 'Chân Quyết', 'Bí Điển', 'Thiên Kinh', 'Thánh Điển', 'Thần Kinh'],
    ATTACK: ['Thuật', 'Chân Pháp', 'Đại Pháp', 'Thiên Quyết', 'Thánh Pháp', 'Thần Thông'],
    DEFENSE: ['Hộ Thể', 'Linh Giáp', 'Đạo Y', 'Thiên Cương', 'Thánh Vực', 'Thần Vực']
});
const SECT_CONTENT = Object.freeze({
    SECT_FIRE: {
        code: 'FIRE', element: 'FIRE',
        roots: { CULTIVATION_ART: 'Xích Diễm', ATTACK: 'Phần Thiên', DEFENSE: 'Viêm Long' }
    },
    SECT_WOOD: {
        code: 'WOOD', element: 'WOOD',
        roots: { CULTIVATION_ART: 'Thanh Mộc Trường Sinh', ATTACK: 'Vạn Mộc', DEFENSE: 'Sinh Linh' }
    },
    SECT_EARTH: {
        code: 'EARTH', element: 'EARTH',
        roots: { CULTIVATION_ART: 'Hậu Thổ', ATTACK: 'Sơn Hà Trấn Nhạc', DEFENSE: 'Bất Động' }
    },
    SECT_WATER: {
        code: 'WATER', element: 'WATER',
        roots: { CULTIVATION_ART: 'Thương Hải', ATTACK: 'Thương Lan', DEFENSE: 'Huyền Thủy' }
    },
    SECT_METAL: {
        code: 'METAL', element: 'METAL',
        roots: { CULTIVATION_ART: 'Canh Kim Kiếm', ATTACK: 'Vạn Kiếm', DEFENSE: 'Kim Cương' }
    },
    SECT_LIGHTNING: {
        code: 'LIGHTNING', element: 'LIGHTNING',
        roots: { CULTIVATION_ART: 'Thiên Lôi', ATTACK: 'Cửu Tiêu Lôi', DEFENSE: 'Lôi Cương' }
    },
    SECT_ICE: {
        code: 'ICE', element: 'ICE',
        roots: { CULTIVATION_ART: 'Hàn Nguyệt', ATTACK: 'Băng Phách', DEFENSE: 'Huyền Băng' }
    },
    SECT_YINYANG: {
        code: 'YINYANG', element: 'CHAOS',
        roots: { CULTIVATION_ART: 'Lưỡng Nghi Hỗn Nguyên', ATTACK: 'Hỗn Độn Âm Dương', DEFENSE: 'Thái Cực' }
    },
    SECT_ASSASSIN: {
        code: 'ASSASSIN', element: 'DARK',
        roots: { CULTIVATION_ART: 'U Minh Sát Thần', ATTACK: 'Vô Ảnh Đoạt Mệnh', DEFENSE: 'Ám Ảnh' }
    },
    SECT_LONGEVITY: {
        code: 'LONGEVITY', element: 'WOOD',
        roots: { CULTIVATION_ART: 'Trường Sinh Bất Lão', ATTACK: 'Sinh Diệt Luân Hồi', DEFENSE: 'Vạn Thọ' }
    }
});

const sectData = readJson('src/data/sect/sect_template.json');
const exchangeRules = readJson('src/data/sect/sect_exchange_template.json').exchangeRules.map((rule) => ({
    ...rule,
    id: `${rule.category}_${rule.grade}`
}));
const baseAttackSkills = readJson('src/data/skills/attack_skill_templates.json').attackSkills;
const baseDefenseSkills = readJson('src/data/skills/defense_skills_templates.json').defenseSkills;

function contentId(prefix, config, grade) {
    return `${prefix}_${config.code}_${grade}`;
}

function displayName(config, category, grade) {
    return `${config.roots[category]} ${NAME_SUFFIXES[category][GRADES.indexOf(grade)]}`;
}

function cloneActions(actions, id, element, category) {
    return actions.map((action, index) => {
        const cloned = { ...action, id: `${id}_ACTION_${String(index + 1).padStart(2, '0')}` };
        if (category === 'ATTACK' && String(cloned.effectId || '').startsWith('ELEMENT_')) {
            cloned.effectId = `ELEMENT_${element}`;
        }
        if (category === 'DEFENSE' && String(cloned.effectId || '').startsWith('DEFENSE_')) {
            cloned.effectId = `DEFENSE_${element}`;
        }
        return cloned;
    });
}

function baseSkillFor(skills, element, grade) {
    return skills.find((skill) => skill.element === element && skill.grade === grade)
        || skills.find((skill) => skill.grade === grade)
        || skills[0];
}

const cultivationArts = [];
const attackSkills = [];
const defenseSkills = [];
const pools = [];

for (const sect of sectData.sects) {
    const config = SECT_CONTENT[sect.id];
    if (!config) throw new Error(`Missing Sect inheritance naming config for ${sect.id}`);
    sect.element = config.element;

    for (const grade of GRADES) {
        const artId = contentId('SECT_ART', config, grade);
        const attackId = contentId('SECT_ATK', config, grade);
        const defenseId = contentId('SECT_DEF', config, grade);
        const artName = displayName(config, 'CULTIVATION_ART', grade);
        const attackName = displayName(config, 'ATTACK', grade);
        const defenseName = displayName(config, 'DEFENSE', grade);
        const baseAttack = baseSkillFor(baseAttackSkills, config.element, grade);
        const baseDefense = baseSkillFor(baseDefenseSkills, config.element, grade);

        cultivationArts.push({
            id: artId,
            displayName: artName,
            label: artName,
            description: `${GRADE_LABELS[grade]} độc truyền của ${sect.displayName}, tăng tốc tu luyện theo phẩm khi phù hợp Linh Căn hệ ${ELEMENT_LABELS[config.element]}.`,
            grade,
            element: config.element,
            sectId: sect.id,
            tags: ['SECT_EXCLUSIVE', sect.id, config.element]
        });
        attackSkills.push({
            ...baseAttack,
            id: attackId,
            displayName: attackName,
            label: attackName,
            description: `${GRADE_LABELS[grade]} công kích độc truyền của ${sect.displayName}, gây sát thương kỹ năng hệ ${ELEMENT_LABELS[config.element]} và hồi chiêu 2 lượt.`,
            grade,
            element: config.element,
            cooldownTurns: 2,
            actions: cloneActions(baseAttack.actions || [], attackId, config.element, 'ATTACK'),
            tags: ['ATTACK', config.element, 'DIRECT_DAMAGE', 'SECT_EXCLUSIVE', sect.id],
            sectId: sect.id
        });
        defenseSkills.push({
            ...baseDefense,
            id: defenseId,
            displayName: defenseName,
            label: defenseName,
            description: `${GRADE_LABELS[grade]} hộ thân độc truyền của ${sect.displayName}, tự tạo khiên khi sinh lực xuống dưới 30%.`,
            grade,
            element: config.element,
            actions: cloneActions(baseDefense.actions || [], defenseId, config.element, 'DEFENSE'),
            tags: ['DEFENSE', 'AUTO_TRIGGER', config.element, 'SECT_EXCLUSIVE', sect.id],
            sectId: sect.id
        });
    }

    for (const rule of exchangeRules) {
        const prefix = rule.category === 'CULTIVATION_ART'
            ? 'SECT_ART'
            : rule.category === 'ATTACK' ? 'SECT_ATK' : 'SECT_DEF';
        const templateId = contentId(prefix, config, rule.grade);
        pools.push({
            id: `${sect.id}:${rule.id}`,
            sectId: sect.id,
            ruleId: rule.id,
            duplicatePolicy: 'DENY_OWNED',
            entries: [{
                itemId: rule.category === 'CULTIVATION_ART' ? templateId : `BOOK_${templateId}`,
                weight: 1
            }]
        });
    }
}

writeJson('src/data/sect/sect_template.json', sectData);
writeJson('src/data/sect/sect_inheritance_templates.json', {
    version: 1,
    cultivationArts,
    attackSkills,
    defenseSkills
});
writeJson('src/data/sect/sect_reward_pools.json', { version: 2, pools });

console.log(JSON.stringify({
    sects: sectData.sects.length,
    cultivationArts: cultivationArts.length,
    attackSkills: attackSkills.length,
    defenseSkills: defenseSkills.length,
    pools: pools.length,
    poolEntries: pools.reduce((sum, pool) => sum + pool.entries.length, 0)
}));
