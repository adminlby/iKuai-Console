// User management CLI — run from backend/:  npm run user <cmd> ...
//   npm run user add    <username> <password>   create a user
//   npm run user passwd <username> <password>   change a password
//   npm run user list                           list users
import { initDb, getUser, addUser, setUserPassword, listUsers } from '../lib/db.mjs'
import { hashPassword } from '../lib/auth.mjs'

const [cmd, username, password] = process.argv.slice(2)

function usage(msg) {
  if (msg) console.error('错误:', msg)
  console.error('用法:\n' +
    '  npm run user add    <username> <password>\n' +
    '  npm run user passwd <username> <password>\n' +
    '  npm run user list')
  process.exit(msg ? 1 : 0)
}

try {
  await initDb()
  if (cmd === 'add') {
    if (!username || !password) usage('需要 <username> 和 <password>')
    if (await getUser(username)) usage(`用户 "${username}" 已存在`)
    await addUser(username, hashPassword(password))
    console.log(`已创建用户 "${username}"`)
  } else if (cmd === 'passwd') {
    if (!username || !password) usage('需要 <username> 和 <password>')
    if (!await setUserPassword(username, hashPassword(password))) usage(`用户 "${username}" 不存在`)
    console.log(`已更新 "${username}" 的密码`)
  } else if (cmd === 'list') {
    const rows = await listUsers()
    if (!rows.length) console.log('(无用户)')
    else for (const r of rows) console.log(`${r.username}\t创建于 ${new Date(Number(r.created_at)).toLocaleString()}`)
  } else {
    usage(cmd ? `未知命令 "${cmd}"` : '')
  }
  process.exit(0)
} catch (e) {
  console.error('失败:', e.message)
  process.exit(1)
}
