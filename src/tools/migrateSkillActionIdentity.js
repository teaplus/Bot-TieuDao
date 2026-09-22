import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sources = [
    { file: 'src/data/skills/attack_skill_templates.json', collection: 'attackSkills' },
    { file: 'src/data/skills/defense_skills_templates.json', collection: 'defenseSkills' }
];
const write = process.argv.includes('--write');
let skillCount = 0;
let actionCount = 0;
let changedCount = 0;

for (const source of sources) {
    const absolutePath = path.join(root, source.file);
    const document = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    const skills = document[source.collection];
    if (!Array.isArray(skills)) throw new Error(`${source.collection} must be an array`);

    for (const skill of skills) {
        if (!skill?.id || !Array.isArray(skill.actions)) {
            throw new Error(`${source.collection} contains an invalid skill`);
        }
        skillCount += 1;
        const localIds = new Set();
        const localOrders = new Set();
        skill.actions.forEach((action, index) => {
            const generatedId = `${skill.id}_ACTION_${String(index + 1).padStart(2, '0')}`;
            if (!action.id) {
                action.id = generatedId;
                changedCount += 1;
            }
            if (action.order == null) {
                action.order = index + 1;
                changedCount += 1;
            }
            if (typeof action.id !== 'string' || !action.id.trim()) {
                throw new Error(`${skill.id}.actions[${index}].id must be a non-empty string`);
            }
            if (!Number.isSafeInteger(action.order) || action.order < 1) {
                throw new Error(`${skill.id}.actions[${index}].order must be a positive safe integer`);
            }
            if (localIds.has(action.id)) {
                throw new Error(`Duplicate action id: ${action.id}`);
            }
            if (localOrders.has(action.order)) {
                throw new Error(`Duplicate action order in ${skill.id}: ${action.order}`);
            }
            localIds.add(action.id);
            actionCount += 1;
        });
    }

    if (write) fs.writeFileSync(absolutePath, `${JSON.stringify(document, null, 2)}\n`);
}

console.log(JSON.stringify({
    status: write ? 'WRITTEN' : 'DRY_RUN',
    skillCount,
    actionCount,
    changedCount
}, null, 2));
