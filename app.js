//필요한 모듈 설치
const express = require('express');
const morgan = require('morgan');
const multer = require('multer');
const mysql = require('mysql');
const path = require('path');

//웹서버 생성과 포트 설정 및 로그 설정
const app = express();
app.set('port',process.env.PORT||1004);

app.use(morgan('dev'));

//시작 페이지 설정
app.get('/', (req, res, next)=>{
	res.send('board 메인 페이지 - 테스트용');
	next();
});

// /boardtbl/select 요청 처리
app.get("/board/list", (req, res, next)=>{
	// DB 접속
	var connection = mysql.createConnection({
		host:'localhost',
		port:3306,
		user:'yskim621',
		password: 'yoonsuk1410517!',
		database:'yskim621'
	});
	
	// 접속이 안되는 경우
	connection.connect(function(err){
		if(err){
			console.log(err);
			throw err;
		}
	});
	
	// 전체 데이터를 가져오는 sql 실행
	var list;
	connection.query('select * from boardtbl', function(err, results, fields){
		if(err){
			throw err;
		}
		list = results;
		//console.log(list);
		//console.log(fields);
	});
	
	// 데이터 개수를 가져오는 sql 실행
	var count;
	connection.query('select count(*) cnt from boardtbl', function(err, results, fields){
		if(err){
			throw err;
		}
		count = results[0].cnt;
		//결과를 json으로 리턴
		res.json({"count":count, 'list':list});
	});
	// 연결 종료
	connection.end();
});

// /board/detail
app.get("/board/detail", (req, res, next) => {
	// DB 접속
	var connection = mysql.createConnection({
		host:'localhost',
		port:3306,
		user:'yskim621',
		password: 'yoonsuk1410517!',
		database:'yskim621'
	});
	
	// 접속이 안되는 경우
	connection.connect(function(err){
		if(err){
			console.log(err);
			throw err;
		}
	});
	
	//get 방식의 파라미터 읽기
	const boardnum = req.query.boardnum;
	//상세보기 SQL 실행
	connection.query('select * from boardtbl where boardnum=?', boardnum, function(err, results, fields){
		if(err){
			throw err
		}
		
		// 검색된 데이터가 없으면
		if(results.length == 0){
			res.json({'result':false})
		} else{
			res.json({'result':true, 'boardnum':results[0]})
		}
	});
	connection.end();
});

// 파일을 읽고 쓰기 위한 모듈
const fs = require('fs');
// /item/data 요청 처리
app.get("/item/date", (req, res, next) => {
	fs.readFile('./update.txt', function(err, data){
		res.json({'result':data.toString()});
	});
});

// post 방식의 파라미터를 읽기 위한 설정
const bodyParser = require('body-parser');
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
	extended:true
}));

// /item/delete(get) 요청을 처리
app.get('/board/delete', (req, res, next)=>{
	res.sendFile(path.join(__dirname, '/delete.html'));
});

// /item/delete(post) 요청을 처리
app.post('/board/delete', (req, res, next)=>{
	//파라미터 읽기
	const itemid = req.body.itemid;
	
	// DB 접속
	var connection = mysql.createConnection({
		host:'localhost',
		port:3306,
		user:'yskim621',
		password: 'yoonsuk1410517!',
		database:'yskim621'
	});
	
	// 접속이 안되는 경우
	connection.connect(function(err){
		if(err){
			console.log(err);
			throw err;
		}
	});
	
	// sql 실행
	connection.query('delete from item where itemid = ?', itemid, function(err, results, fields){
		if(err){
			throw err
		}
		console.log(results);
		
		// 삭제 성공한 경우
		if(results.affectedRows>0){
			res.json({'result':true});
			
			// 성공한 경우 파일에 성공한 시간을 기록
			const writeStream = fs.createWriteStream('./update.txt');
			writeStream.write(Date.now().toString());
			writeStream.end();
		} else{
			res.json({'result':false});
		}
	});
	connection.end();
});

// 파일 업로드를 위한 설정

// 업로드할 디렉토리 설정 및 생성
try{
	fs.readdirSync('img');
} catch(error){
	fs.mkdirSync('img')
}

//업로드 옵션 설정
const upload = multer({
	storage:multer.diskStorage({
		destination(req, file, done){
			done(null, 'img/');
		},
		filename(req, file, done){
			const ext = path.extname(file.originalname);
			done(null, path.basename(file.originalname, ext) + Date.now() + ext);
		},
	}),
	limits:{fileSize:1024 * 1024 * 10},
});


///item/insert(get) 요청을 처리
app.get('/board/insert', (req, res, next)=>{
	res.sendFile(path.join(__dirname, '/insert.html'));
});


//삽입 요청 처리를 코드
app.post('/board/insert', upload.single('pictureurl'), (req, res, next) => {
	//파라미터 읽기
	const itemname = req.body.itemname;
	const description = req.body.description;
	const price = req.body.price;
	
	//업로드된 파일이름 가져오기
	var pictureurl;
	if(req.file){
		pictureurl = req.file.filename;
	}else{
		pictureurl = 'default.jpg';
	}
	
	// DB 접속
	var connection = mysql.createConnection({
		host:'localhost',
		port:3306,
		user:'yskim621',
		password: 'yoonsuk1410517!',
		database:'yskim621'
	});
	
	// 접속이 안되는 경우
	connection.connect(function(err){
		if(err){
			console.log(err);
			throw err;
		}
	});
	
	//가장 큰 itemid 찾아오기
	connection.query('select max(itemid) maxid from item',
		 function(err, results, fields){
			if(err){
				throw err;
			}
			
			var itemid;
			if(results.length > 0){
				itemid = results[0].maxid + 1;
			}else{
				itemid = 1;
			}
			
			connection.query('insert into item(itemid, itemname, price, description, pictureurl) value(?,?,?,?,?)', 
			 [itemid, itemname, price, description, pictureurl],
			 function(err, results, fields){
			  if(err){
				  throw err;
			  }
			  if(results.affectedRows>0){
				  const writeStream = fs.createWriteStream('./update.txt');
				  writeStream.write(Date.now().toString());
				  writeStream.end();
				  
				  res.send({'result':true});
			  } else{
				  res.send({'result':false});
			  }
			});
			
	});
});

//img 디렉토리에 있는 파일을 다운로드 받을 수 있도록 설정
var util = require('util');
var mime = require('mime');

app.get('/img/:fileid', (req, res) => {
	//img 뒤 부분을 가져옴
	var fileid = req.params.fileid;
	
	// 파일의 절대 경로를 생성
	var file = '\\Users\\user\\Desktop\\Node\\eclipse-workspace\\nodedatabase\\img' + '/' + fileid;
	
	// 헤더에 파일 이름을 설정
	mimetype=mime.lookup(fileid);
	res.setHeader('Content-disposition', 'attachment; filename=' + fileid);
	res.setHeader('Content-type', mimetype);
	
	//다운로드
	var filestream = fs.createReadStream(file);
	filestream.pipe(res);
});

//에러 페이지 설정
app.use((err, req, res, next)=>{
	console.log(err);
	res.send(err.message);
});

//서버 실행
app.listen(app.get('port'),()=>{
	console.log(app.get('port'),'번 포트에서 대기중 ');
	console.log('board Server 정상 작동 중');
});	
