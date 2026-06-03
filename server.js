require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const XLSX = require('xlsx');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


const upload = multer({ storage: multer.memoryStorage() });

//this is how schema is created , get a basic idea about mongodb and its schema
const coalSchema = new mongoose.Schema(
  {
    coal:      { type: mongoose.Schema.Types.Mixed, default: null },
    SiO2:      { type: mongoose.Schema.Types.Mixed, default: null },
    Al2O3:     { type: mongoose.Schema.Types.Mixed, default: null },
    Fe2O3:     { type: mongoose.Schema.Types.Mixed, default: null },
    CaO:       { type: mongoose.Schema.Types.Mixed, default: null },
    MgO:       { type: mongoose.Schema.Types.Mixed, default: null },
    Na2O:      { type: mongoose.Schema.Types.Mixed, default: null },
    K2O:       { type: mongoose.Schema.Types.Mixed, default: null },
    TiO2:      { type: mongoose.Schema.Types.Mixed, default: null },
    SO3:       { type: mongoose.Schema.Types.Mixed, default: null },
    P2O5:      { type: mongoose.Schema.Types.Mixed, default: null },
    Mn3O4:     { type: mongoose.Schema.Types.Mixed, default: null },
    SulphurS:  { type: mongoose.Schema.Types.Mixed, default: null },
    gcv:       { type: mongoose.Schema.Types.Mixed, default: null },
    cost:      { type: mongoose.Schema.Types.Mixed, default: null },
    coalId:    { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

const Coal = mongoose.model('Coal', coalSchema);


const FIELD_MAP = {
  coal:     'coal',
  sio2:     'SiO2',
  al2o3:    'Al2O3',
  fe2o3:    'Fe2O3',
  cao:      'CaO',
  mgo:      'MgO',
  na2o:     'Na2O',
  k2o:      'K2O',
  tio2:     'TiO2',
  so3:      'SO3',
  p2o5:     'P2O5',
  mn3o4:    'Mn3O4',
  sulphurs: 'SulphurS',
  gcv:      'gcv',
  cost:     'cost',
  coalid:   'coalId',
};



//this is the api for get , get a basic idea about get
app.get('/api/coals', async (req, res) => {
  try {
    const coals = await Coal.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: coals.length, data: coals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//this is the api for upload , get a basic idea about post 
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file received.' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (rows.length < 2) {
      return res.status(400).json({ success: false, error: 'Sheet has no data rows.' });
    }

    
    const rawHeaders = rows[0].map(h => String(h).trim());
    const mappedKeys = rawHeaders.map(h => FIELD_MAP[h.toLowerCase()] || null);

    const docs = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row.some(c => c !== '' && c !== null && c !== undefined)) continue;

      const doc = {};
      mappedKeys.forEach((key, idx) => {
        if (key) doc[key] = row[idx] ?? null;
      });
      docs.push(doc);
    }

    if (!docs.length) {
      return res.status(400).json({ success: false, error: 'No valid rows found in sheet.' });
    }

    const inserted = await Coal.insertMany(docs);
    res.json({ success: true, inserted: inserted.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//go through this section for deletion as you will have to create updation part next 
app.delete('/api/coals/:id', async (req, res) => {
  try {
    const result = await Coal.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ success: false, error: 'Record not found.' });
    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/coals/:id', async (req, res) => {
  try {
    const result = await Coal.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!result) return res.status(404).json({ success: false, error: 'Record not found.' });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//this is for you to understand how our main page is like this code will tell the server to send the index.html file for any route that doesn't match the above API routes.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log(`✅  MongoDB connected: ${MONGODB_URI}`);
    app.listen(PORT, () => console.log(`🚀  Server running at http://localhost:${PORT}`));
  })
  .catch(err => {
    console.log(MONGODB_URI);
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });
