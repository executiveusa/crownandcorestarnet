import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const state=JSON.parse(fs.readFileSync(path.join(root,'data','current-state.json'),'utf8'));
const proof=JSON.parse(fs.readFileSync(path.join(root,'data','evidence','public-booking-path-2026-09-28.json'),'utf8'));

const failures=[];
const m=state.metrics||{};

if(m.booking_destination_verified!==true) failures.push('booking destination must be verified');
if(m.booking_service_catalog_verified!==true) failures.push('Square service catalog must be verified');
if(m.booking_completion_verified!==null) failures.push('full booking completion must remain unknown/null until safely tested');
if(m.booking_path_verified!==null) failures.push('legacy booking_path_verified must not be used as a false full-path claim');
if(proof.verified?.full_booking_completion_verified!==false) failures.push('public proof must explicitly say full completion was not verified');
if(proof.sources?.[1]?.status!==200) failures.push('Square public destination proof must have HTTP 200 evidence');

if(failures.length){
  console.error('Booking proof validation FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}

console.log('Booking proof validation passed: CTA and Square service catalog verified; completed booking remains unverified.');
