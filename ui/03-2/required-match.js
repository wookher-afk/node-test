// Shared field IDs for future bilateral matching; this module does not match people.
export const WORKER_REQUIRED_KEYS=Object.freeze(['workAbility','region','pay','hours','schedule']);
export const COMPANY_REQUIRED_KEYS=Object.freeze([...WORKER_REQUIRED_KEYS,'experience','difficulty','paymentTerms','paymentMethod','taxTerms','otherTerms']);
export const REQUIRED_MATCH_POLICY=Object.freeze({version:1,maxSelected:3,workerScope:'account_profile',companyScope:'recruitment_group',occupationRule:'all_per_person',workAbilityCountsAs:1,requiredSides:'both',legalRequirements:'independent_mandatory_gate',engineImplemented:false});
export function validateRequiredMatch(value,allowed){
 if(!Array.isArray(value)||value.length>3||new Set(value).size!==value.length||value.some(k=>!allowed.includes(k))){const e=new Error('필수 일치 조건은 허용된 항목에서 중복 없이 최대 3개 선택하세요.');e.status=400;throw e;}
 return [...value];
}
