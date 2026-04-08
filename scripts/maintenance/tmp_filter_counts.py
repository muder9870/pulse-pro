import requests
s = requests.get('http://localhost:5000/api/stories?limit=200&source=arxiv').json()
print('arxiv count', len(s))
print('analyzed', len([x for x in s if x.get('summary')]))
print('deep', len([x for x in s if x.get('has_deep_analysis')]))
print('hasContent', len([x for x in s if x.get('posts') and len(x.get('posts'))>0]))
