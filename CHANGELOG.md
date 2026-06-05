# Changelog

## [0.17.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.16.2...one-another-v0.17.0) (2026-06-01)

### Features

- add passwordless resign system ([#117](https://github.com/iamsaleeb/one-another/issues/117)) ([6cc063c](https://github.com/iamsaleeb/one-another/commit/6cc063ca71e09fdc011da328a16a265922f7d181))
- add save button ([#123](https://github.com/iamsaleeb/one-another/issues/123)) ([3dc8c15](https://github.com/iamsaleeb/one-another/commit/3dc8c1517322f8ab7673460d5eec1cf3cf010be7))
- auth recreation as module and rbac ([#125](https://github.com/iamsaleeb/one-another/issues/125)) ([b6b67e6](https://github.com/iamsaleeb/one-another/commit/b6b67e6d7dace5106255dc1f6c2b725fedd763b0))
- create new church following vs all events ([#116](https://github.com/iamsaleeb/one-another/issues/116)) ([2aeff98](https://github.com/iamsaleeb/one-another/commit/2aeff98bec5634b34ce023c21ffbb6d757f6750b))
- redesign wizard onboarding ([#119](https://github.com/iamsaleeb/one-another/issues/119)) ([a4e8f46](https://github.com/iamsaleeb/one-another/commit/a4e8f46d85d48babc05f76fbdf2c40d06f1b36d8))
- refactor into using domain modules ([#124](https://github.com/iamsaleeb/one-another/issues/124)) ([e048b9a](https://github.com/iamsaleeb/one-another/commit/e048b9a0daae43749e1c4cb5c0fe9032429a950a))
- unauthenticated view ([#118](https://github.com/iamsaleeb/one-another/issues/118)) ([733ee0d](https://github.com/iamsaleeb/one-another/commit/733ee0dba11a2504a863ea206f0c935ac8e900c7))
- update profile page ([#120](https://github.com/iamsaleeb/one-another/issues/120)) ([795c8b6](https://github.com/iamsaleeb/one-another/commit/795c8b6b4eb128e1734bdcf236594acbff7177c1))

### Bug Fixes

- improve color contrast to meet WCAG 2 AA thresholds ([#113](https://github.com/iamsaleeb/one-another/issues/113)) ([c4610d3](https://github.com/iamsaleeb/one-another/commit/c4610d3b82e7d622ac7132283e83620dea7ae227))
- pre-launch audit ([#111](https://github.com/iamsaleeb/one-another/issues/111)) ([d7474e8](https://github.com/iamsaleeb/one-another/commit/d7474e85f11a2377c25626f0e1bd33ec4bcb731a))

### Performance Improvements

- **auth:** embed church memberships in JWT to eliminate per-request DB queries ([#115](https://github.com/iamsaleeb/one-another/issues/115)) ([fcc713a](https://github.com/iamsaleeb/one-another/commit/fcc713ac3d16a9b5fba792b78c14a307e12851d8))
- fix LCP image priority and events/[id] fetch waterfall ([#114](https://github.com/iamsaleeb/one-another/issues/114)) ([6f6685b](https://github.com/iamsaleeb/one-another/commit/6f6685bf555a0323d540e8f3e09dfc33beca51f2))
- improve LCP on home page ([#122](https://github.com/iamsaleeb/one-another/issues/122)) ([6132022](https://github.com/iamsaleeb/one-another/commit/6132022bbb372ed06a416e854bc9ac45656a5d3a))

## [0.16.2](https://github.com/iamsaleeb/one-another/compare/one-another-v0.16.1...one-another-v0.16.2) (2026-05-15)

### Bug Fixes

- added proper formatting ([#109](https://github.com/iamsaleeb/one-another/issues/109)) ([325f2aa](https://github.com/iamsaleeb/one-another/commit/325f2aa2be23f1a3727fa1a07c866405422c079b))
- update shadcn components and fix form/RHF compliance ([#107](https://github.com/iamsaleeb/one-another/issues/107)) ([22cc750](https://github.com/iamsaleeb/one-another/commit/22cc750dbd0da852ca38ddd7702f80cf8190760e))
- vercel speed fixes ([#110](https://github.com/iamsaleeb/one-another/issues/110)) ([2086933](https://github.com/iamsaleeb/one-another/commit/208693345df8a5caa4bbc41fbba04294922fba29))

## [0.16.1](https://github.com/iamsaleeb/one-another/compare/one-another-v0.16.0...one-another-v0.16.1) (2026-05-11)

### Bug Fixes

- giant refactoring ([#105](https://github.com/iamsaleeb/one-another/issues/105)) ([23e87b2](https://github.com/iamsaleeb/one-another/commit/23e87b27bd82c30bfddcf8ced14058eebf2dee13))

## [0.16.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.15.0...one-another-v0.16.0) (2026-05-09)

### Features

- added further seeding ([#104](https://github.com/iamsaleeb/one-another/issues/104)) ([1160460](https://github.com/iamsaleeb/one-another/commit/116046021cbb83a54c5e9d83cd29b0a62c5a515b))
- custom questions for registration events ([#97](https://github.com/iamsaleeb/one-another/issues/97)) ([489a2b8](https://github.com/iamsaleeb/one-another/commit/489a2b8b223267b6ef9aa4a50aaa3bf89185b657))
- fixed notifications refactoring ([#102](https://github.com/iamsaleeb/one-another/issues/102)) ([ddb9d98](https://github.com/iamsaleeb/one-another/commit/ddb9d988cc7c20d9a667d6f1914cca47fd18cbf2))
- register for an event ([#103](https://github.com/iamsaleeb/one-another/issues/103)) ([7fdfb52](https://github.com/iamsaleeb/one-another/commit/7fdfb52432927f66a379f24153693f025da282ac))
- remove account fixes ([#101](https://github.com/iamsaleeb/one-another/issues/101)) ([6c5e105](https://github.com/iamsaleeb/one-another/commit/6c5e105d665522394b2973bd4f659bb7a9ec7a8f))
- replace Uploadthing with Vercel Blob for photo uploads ([#95](https://github.com/iamsaleeb/one-another/issues/95)) ([9b121ff](https://github.com/iamsaleeb/one-another/commit/9b121ffbe5799f69d649fc29f3e41faa12206e6a))

### Bug Fixes

- fixes existing event creation page issues ([#93](https://github.com/iamsaleeb/one-another/issues/93)) ([f8e0324](https://github.com/iamsaleeb/one-another/commit/f8e0324d76fb44b46b143de7190298c109f0be7a))
- remove unused files ([#96](https://github.com/iamsaleeb/one-another/issues/96)) ([e62714c](https://github.com/iamsaleeb/one-another/commit/e62714c927720adadc0bc23fa73b357852ef724f))

## [0.15.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.14.0...one-another-v0.15.0) (2026-05-01)

### Features

- event wizard ([#89](https://github.com/iamsaleeb/one-another/issues/89)) ([272b601](https://github.com/iamsaleeb/one-another/commit/272b601968a99f8d013da430209cef7337eeaaf1))

### Bug Fixes

- patched vulnerabilities ([#92](https://github.com/iamsaleeb/one-another/issues/92)) ([776b506](https://github.com/iamsaleeb/one-another/commit/776b506936584db1e26f1605ce5173c0c7a09ffc))

## [0.14.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.13.2...one-another-v0.14.0) (2026-04-24)

### Features

- Event lists showing churches and badge correctly ([#88](https://github.com/iamsaleeb/one-another/issues/88)) ([d017036](https://github.com/iamsaleeb/one-another/commit/d017036e7668ff7fe504fec17f2423a02b560059))

### Bug Fixes

- fixed loading.tsx issues and loaded stability measures ([#86](https://github.com/iamsaleeb/one-another/issues/86)) ([f328f60](https://github.com/iamsaleeb/one-another/commit/f328f60835a535929d4f43d6969baf4c0ce110fd))

## [0.13.2](https://github.com/iamsaleeb/one-another/compare/one-another-v0.13.1...one-another-v0.13.2) (2026-04-23)

### Bug Fixes

- fix database seeding ([#84](https://github.com/iamsaleeb/one-another/issues/84)) ([0bcf78d](https://github.com/iamsaleeb/one-another/commit/0bcf78d029f146f8e6d41f6f71274d893948c3ce))
- vercel feature branch deploys ([#82](https://github.com/iamsaleeb/one-another/issues/82)) ([bee245a](https://github.com/iamsaleeb/one-another/commit/bee245a7041cc797e4531649396e49c4955eb50b))

## [0.13.1](https://github.com/iamsaleeb/one-another/compare/one-another-v0.13.0...one-another-v0.13.1) (2026-04-21)

### Bug Fixes

- fixed remote caching issues ([#80](https://github.com/iamsaleeb/one-another/issues/80)) ([77f2444](https://github.com/iamsaleeb/one-another/commit/77f24444e023879fc0f4d68f4164cedbbf188239))

## [0.13.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.12.1...one-another-v0.13.0) (2026-04-21)

### Features

- notification rebuild ([#78](https://github.com/iamsaleeb/one-another/issues/78)) ([70fde2b](https://github.com/iamsaleeb/one-another/commit/70fde2b529ff9e5d706bc5d3bd48e3614a96aaf4))

### Bug Fixes

- added refactoring job ([#76](https://github.com/iamsaleeb/one-another/issues/76)) ([b586336](https://github.com/iamsaleeb/one-another/commit/b5863369f5bd2eeeafa0fdc7cee803743bc50375))

## [0.12.1](https://github.com/iamsaleeb/one-another/compare/one-another-v0.12.0...one-another-v0.12.1) (2026-04-17)

### Bug Fixes

- big refactor of server actions ([#75](https://github.com/iamsaleeb/one-another/issues/75)) ([0f47570](https://github.com/iamsaleeb/one-another/commit/0f475708bdd9337e99145264032653587c421a79))
- fixed caching issues ([#73](https://github.com/iamsaleeb/one-another/issues/73)) ([615192a](https://github.com/iamsaleeb/one-another/commit/615192a5b21a48e9a16338b5021fdc0840fb8621))

## [0.12.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.11.0...one-another-v0.12.0) (2026-04-16)

### Features

- added analytics and info etc ([#72](https://github.com/iamsaleeb/one-another/issues/72)) ([ee5fefe](https://github.com/iamsaleeb/one-another/commit/ee5fefeb61ca0049f06e8a6081a48f4c2babce30))

### Bug Fixes

- optimise the db and loading of pages ([#70](https://github.com/iamsaleeb/one-another/issues/70)) ([58ad796](https://github.com/iamsaleeb/one-another/commit/58ad79668da1eb5e434a188a5d42f47a78802c3d))

## [0.11.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.10.3...one-another-v0.11.0) (2026-04-15)

### Features

- added new caching ([#68](https://github.com/iamsaleeb/one-another/issues/68)) ([b83f03d](https://github.com/iamsaleeb/one-another/commit/b83f03d520fcca5bb7f2b9283f3247211a3729f7))

## [0.10.3](https://github.com/iamsaleeb/one-another/compare/one-another-v0.10.2...one-another-v0.10.3) (2026-04-05)

### Bug Fixes

- Update README.md ([#66](https://github.com/iamsaleeb/one-another/issues/66)) ([292cba5](https://github.com/iamsaleeb/one-another/commit/292cba52ced1399ed479f35a760cb0daa6a77c93))

## [0.10.2](https://github.com/iamsaleeb/one-another/compare/one-another-v0.10.1...one-another-v0.10.2) (2026-04-05)

### Bug Fixes

- added git vercel fixes ([#63](https://github.com/iamsaleeb/one-another/issues/63)) ([776fbc3](https://github.com/iamsaleeb/one-another/commit/776fbc332ad529b4ccd494a3bdbeacb665f91fef))

## [0.10.1](https://github.com/iamsaleeb/one-another/compare/one-another-v0.10.0...one-another-v0.10.1) (2026-04-05)

### Bug Fixes

- added deploys ([#61](https://github.com/iamsaleeb/one-another/issues/61)) ([ef13eca](https://github.com/iamsaleeb/one-another/commit/ef13ecacefcb25bed1234e6a243a68db49048cb7))

## [0.10.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.9.0...one-another-v0.10.0) (2026-04-05)

### Features

- added new account registrations with email verification ([#59](https://github.com/iamsaleeb/one-another/issues/59)) ([c2104c0](https://github.com/iamsaleeb/one-another/commit/c2104c0668d933e78d7df119eedc80019b0407b3))

### Bug Fixes

- added package upgrades ([#60](https://github.com/iamsaleeb/one-another/issues/60)) ([22752bf](https://github.com/iamsaleeb/one-another/commit/22752bfaff91a88e9338e6f8ae15c8943922e97b))
- fixed and refactored codebase ([#57](https://github.com/iamsaleeb/one-another/issues/57)) ([bf4efd7](https://github.com/iamsaleeb/one-another/commit/bf4efd7e542632c9a36c6620e447d51ec3490ede))

## [0.9.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.8.0...one-another-v0.9.0) (2026-04-03)

### Features

- added camp registrations ([#56](https://github.com/iamsaleeb/one-another/issues/56)) ([b4b43de](https://github.com/iamsaleeb/one-another/commit/b4b43def19f422c86d68f50b98cf3cc513d550e5))

### Bug Fixes

- fixed authentication models ([#55](https://github.com/iamsaleeb/one-another/issues/55)) ([e21d3d1](https://github.com/iamsaleeb/one-another/commit/e21d3d1b5fe10b3d966d580c57ab5e43cabc95c0))
- fixed the issues regarding date time UTC ([#53](https://github.com/iamsaleeb/one-another/issues/53)) ([7ac3faa](https://github.com/iamsaleeb/one-another/commit/7ac3faa9a29d73dfa8eb996829410426eadfe546))

## [0.8.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.7.0...one-another-v0.8.0) (2026-04-03)

### Features

- added cron fixes and new system ([#52](https://github.com/iamsaleeb/one-another/issues/52)) ([991399c](https://github.com/iamsaleeb/one-another/commit/991399c9ec40c83431701407c78813eff29b8ff3))
- added jsonb object type for events ([#51](https://github.com/iamsaleeb/one-another/issues/51)) ([c4133b4](https://github.com/iamsaleeb/one-another/commit/c4133b40ce5652bd4f586b5e7ffd0b7e3e1ad751))
- delete account ability ([#46](https://github.com/iamsaleeb/one-another/issues/46)) ([67afca7](https://github.com/iamsaleeb/one-another/commit/67afca7f69e4588b45efd13911a8f5794b4c1cc8))

### Bug Fixes

- fix the logout issues in android and category for events ([#50](https://github.com/iamsaleeb/one-another/issues/50)) ([583e2d1](https://github.com/iamsaleeb/one-another/commit/583e2d17c430b0869ac35d9591cfec6ba34eca1c))

## [0.7.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.6.0...one-another-v0.7.0) (2026-04-02)

### Features

- added onboarding setup ([#43](https://github.com/iamsaleeb/one-another/issues/43)) ([69e4781](https://github.com/iamsaleeb/one-another/commit/69e4781ba6041c5f14dd39aa6b47c6d694c0e870))

## [0.6.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.5.0...one-another-v0.6.0) (2026-04-02)

### Features

- added my event screen ([#42](https://github.com/iamsaleeb/one-another/issues/42)) ([baf2baa](https://github.com/iamsaleeb/one-another/commit/baf2baae01b7dc1c9b080330f8b4a43cb4596875))
- photos implemented ([#39](https://github.com/iamsaleeb/one-another/issues/39)) ([e2afa46](https://github.com/iamsaleeb/one-another/commit/e2afa460ef8d99610307d7e95945b246ab3ae65e))

### Bug Fixes

- Fixed up incorrect badge and data retention ([#41](https://github.com/iamsaleeb/one-another/issues/41)) ([282ab08](https://github.com/iamsaleeb/one-another/commit/282ab0875d644d8b329d4d33246cecb025f5ca29))

## [0.5.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.4.1...one-another-v0.5.0) (2026-04-01)

### Features

- added new drafts system ([#35](https://github.com/iamsaleeb/one-another/issues/35)) ([b86ea0b](https://github.com/iamsaleeb/one-another/commit/b86ea0bca658a3f180abe9bfb6e10c8de2a3d825))

### Bug Fixes

- fixed ui issues ([#38](https://github.com/iamsaleeb/one-another/issues/38)) ([5e1e101](https://github.com/iamsaleeb/one-another/commit/5e1e101555218dbd74afd34b43bfb0184cbe66b7))

## [0.4.1](https://github.com/iamsaleeb/one-another/compare/one-another-v0.4.0...one-another-v0.4.1) (2026-03-31)

### Bug Fixes

- added badge ([#26](https://github.com/iamsaleeb/one-another/issues/26)) ([11caf60](https://github.com/iamsaleeb/one-another/commit/11caf608d91be7ea9a13fc580b34889acb4e9336))

## [0.4.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.3.0...one-another-v0.4.0) (2026-03-30)

### Features

- added push notifications ([#18](https://github.com/iamsaleeb/one-another/issues/18)) ([f63722d](https://github.com/iamsaleeb/one-another/commit/f63722dbd0aad855b2b5d9e96fdcc954dce72d2a))
- Ts and Cs added ([#24](https://github.com/iamsaleeb/one-another/issues/24)) ([6ba81cd](https://github.com/iamsaleeb/one-another/commit/6ba81cdbc02395630b0e8e24aef32398ee0181b9))

### Bug Fixes

- fixed back button issues ([#23](https://github.com/iamsaleeb/one-another/issues/23)) ([a4aaa9c](https://github.com/iamsaleeb/one-another/commit/a4aaa9cf427c002619ef2795f8932554641b0d64))
- fixed offset issues ([#21](https://github.com/iamsaleeb/one-another/issues/21)) ([c00c8b7](https://github.com/iamsaleeb/one-another/commit/c00c8b794d341141171b6bd6ac35881dba21f50c))
- fixed profile page back button and design ([#22](https://github.com/iamsaleeb/one-another/issues/22)) ([674c5a5](https://github.com/iamsaleeb/one-another/commit/674c5a508c2fff96f0916e3a54432e56a7d4f075))

## [0.3.0](https://github.com/iamsaleeb/one-another/compare/one-another-v0.2.0...one-another-v0.3.0) (2026-03-28)

### Features

- added church dynamic data, removed unused info([#17](https://github.com/iamsaleeb/one-another/issues/17)) ([f7ba596](https://github.com/iamsaleeb/one-another/commit/f7ba596db97ff22de521f71007466257e53df69d))
- added new follow series button ([#10](https://github.com/iamsaleeb/one-another/issues/10)) ([23fd299](https://github.com/iamsaleeb/one-another/commit/23fd29954268f74a58c320f83ba42dfad83219d4))

## [0.2.0](https://github.com/iamsaleeb/one-another1/compare/one-another-v0.1.0...one-another-v0.2.0) (2026-03-26)

### Features

- prove versioning works ([787936e](https://github.com/iamsaleeb/one-another1/commit/787936e7e184df68f11e2214349ca2b661dbaf59))
- testing title ([51b1183](https://github.com/iamsaleeb/one-another1/commit/51b1183b4253967571d9f93d8b9fe11c3d9a0737))
- Update README.md ([#3](https://github.com/iamsaleeb/one-another1/issues/3)) ([c446f0a](https://github.com/iamsaleeb/one-another1/commit/c446f0a2edd48a63777d5a89b448fcc6297b8d16))
