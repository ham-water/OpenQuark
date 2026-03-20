# Search Input Interpretation Examples

## Input

`웹사이트 구현하는 방법`

## Expected shape

```json
{
  "rawQuery": "웹사이트 구현하는 방법",
  "goal": "웹사이트 구현 방법 파악",
  "domain": "웹 개발",
  "possibleTechs": ["HTML", "CSS", "JavaScript", "React"],
  "searchQueries": [
    "웹사이트 구현하는 방법",
    "웹사이트 구현 방법",
    "웹 개발 튜토리얼",
    "website tutorial",
    "html css javascript website tutorial",
    "react website setup guide"
  ]
}
```

## Input

`JWT 로그인 구현 보안 이슈`

## Expected shape

```json
{
  "rawQuery": "JWT 로그인 구현 보안 이슈",
  "goal": "JWT 로그인 구현 시 보안 이슈 파악",
  "domain": "보안",
  "possibleTechs": ["JWT", "OAuth 2.0", "CSP", "OWASP Top 10"],
  "searchQueries": [
    "JWT 로그인 구현 보안 이슈",
    "JWT 로그인 보안 체크리스트",
    "application security checklist",
    "authentication security best practices",
    "owasp application security checklist",
    "jwt authentication security best practices"
  ]
}
```
