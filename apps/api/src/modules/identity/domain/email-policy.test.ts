/* Email sign-up policy tests — allowlist: education + popular providers pass,
   temporary/disposable and unknown domains are refused (§8.2 one authority). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emailDomain, isAllowedEmail, isAllowedEmailDomain, isEducationDomain, parseExtraDomains,
} from './email-policy.js';

test('extracts the domain part (case-insensitive)', () => {
  assert.equal(emailDomain('Ahmed@Gmail.COM'), 'gmail.com');
  assert.equal(emailDomain('no-at-sign'), '');
});

test('education domains always pass', () => {
  assert.ok(isEducationDomain('mit.edu'));
  assert.ok(isEducationDomain('ejust.edu.eg'));
  assert.ok(isEducationDomain('student.ejust.edu.eg'));
  assert.ok(isAllowedEmail('ahmed@ejust.edu.eg'));
  assert.ok(isAllowedEmail('a@mit.edu'));
});

test('education suffix does not over-match', () => {
  assert.ok(!isEducationDomain('evil-edu.com'));
  assert.ok(!isEducationDomain('edu.com'));   // 'edu.com' is a commercial domain, not .edu
  assert.ok(!isEducationDomain('myedu.co'));
});

test('popular providers pass', () => {
  for (const email of [
    'ahmed@gmail.com', 'a@googlemail.com',
    'a@outlook.com', 'a@hotmail.com', 'a@live.com', 'a@msn.com', 'a@outlook.eg',
    'a@yahoo.com', 'a@ymail.com', 'a@rocketmail.com', 'a@yahoo.co.jp',
    'a@icloud.com', 'a@me.com', 'a@mac.com',
    'a@aol.com', 'a@aim.com',
    'a@proton.me', 'a@protonmail.com', 'a@pm.me',
    'a@zoho.com', 'a@zohomail.com',
    'a@mail.com', 'a@email.com',
    'a@gmx.com', 'a@gmx.net', 'a@web.de',
    'a@fastmail.com', 'a@fastmail.fm',
    'a@tuta.io', 'a@tutanota.com', 'a@keemail.me',
    'a@hey.com', 'a@hushmail.com', 'a@mailfence.com',
    'a@yandex.com', 'a@yandex.ru', 'a@ya.ru',
    'a@mail.ru', 'a@inbox.ru', 'a@bk.ru',
    'a@qq.com', 'a@foxmail.com', 'a@163.com', 'a@126.com',
    'a@naver.com', 'a@rediffmail.com',
  ]) {
    assert.ok(isAllowedEmail(email), `expected allowed: ${email}`);
  }
});

test('temporary / disposable mailboxes are refused', () => {
  for (const email of [
    'fetajav577@playboot.com',
    'a@mailinator.com', 'a@10minutemail.com', 'a@guerrillamail.com',
    'a@yopmail.com', 'a@temp-mail.org', 'a@tempmail.com', 'a@trashmail.com',
  ]) {
    assert.ok(!isAllowedEmail(email), `expected refused: ${email}`);
  }
});

test('unknown corporate/private domains are refused (allowlist semantics)', () => {
  assert.ok(!isAllowedEmail('a@randomcorp.com'));
  assert.ok(!isAllowedEmail('a@some-startup.io'));
});

test('case-insensitive matching', () => {
  assert.ok(isAllowedEmailDomain('GMAIL.COM'));
  assert.ok(isAllowedEmail('A@Outlook.EG'));
  assert.ok(!isAllowedEmail('A@Mailinator.Com'));
});

test('env extension: exact and wildcard subdomain', () => {
  const extra = parseExtraDomains('  mycompany.eg,  sub.corp.com ');
  assert.deepEqual(extra, ['mycompany.eg', 'sub.corp.com']);
  assert.ok(isAllowedEmail('a@mycompany.eg', extra));
  assert.ok(isAllowedEmail('a@sub.corp.com', extra));
  assert.ok(isAllowedEmail('a@dept.sub.corp.com', extra));
  assert.ok(!isAllowedEmail('a@other.com', extra));
});

test('empty or missing domain is refused', () => {
  assert.ok(!isAllowedEmailDomain(''));
  assert.ok(!isAllowedEmail('no-domain'));
});
