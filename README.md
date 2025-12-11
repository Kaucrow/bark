# BARK
Logger

## Right use

```javascript
app.use(bark({}))
app.use(express.static('public'));
```
If it's used after the ```static('public')``` it's not going to log the dispatch of files

### Dependences
- express
- picocolors
- sqlite3