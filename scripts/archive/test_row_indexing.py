import sqlite3

conn = sqlite3.connect(':memory:')
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute('CREATE TABLE test (id INTEGER, name TEXT)')
cur.execute('INSERT INTO test VALUES (1, "test")')
cur.execute('SELECT * FROM test')
row = cur.fetchone()

print('Testing sqlite3.Row indexing:')
try:
    print(f'Integer indexing: row[0]={row[0]}, row[1]={row[1]}')
except Exception as e:
    print(f'Integer indexing failed: {type(e).__name__}: {e}')

try:
    print(f'Named indexing: row["id"]={row["id"]}, row["name"]={row["name"]}')
except Exception as e:
    print(f'Named indexing failed: {type(e).__name__}: {e}')
