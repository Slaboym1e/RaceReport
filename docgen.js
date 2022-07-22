const e = require('express');
const doc = require('pdfkit');
const PDFKit = require('pdfkit');

class mpdf extends PDFKit{
    constructor(res, RaceName, RaceDates,Locatiaon, Distance){
        super({size:'A4', margins:{top:10,left:15,right:15}});
        super.pipe(res);
        super.registerFont('ArialBold',`${__dirname}/public/fonts/bold_Arial.ttf`);
        super.registerFont('Arial', `${__dirname}/public/fonts/Arial.ttf`);
        super.font(`Arial`);
        this.RaceName = RaceName;
        this.RaceDates = RaceDates;
        this.Distance = Distance;
        this.Locatiaon = Locatiaon;
    }
    addHeader(subtitle, Pagetype){
        let lineWidth;
        Pagetype == undefined || Pagetype == 'portrait'? lineWidth = 590 : lineWidth = 836 
        super.font('Arial');
        super.fontSize(10);
        if (Pagetype == undefined || Pagetype == 'portrait'){
            super.text(this.RaceName, {align:'center'});
            super.text(this.RaceDates, {align:'center'});
        }
        else{
        super.text(this.RaceName,133,10, {align:'center', width: 570});
        super.text(this.RaceDates,{align:'center', width: 570});
        }
        super.moveTo(5,50).lineTo(lineWidth,50).stroke();
        super.text(this.Locatiaon,0,55,{align:'right'});
        super.text(subtitle,0, 65,{align:'right'});
        super.moveTo(5, 80);
        super.moveTo(5,80).lineTo(lineWidth,80).stroke();
    }
    DaddPage(subtitle, type){
        super.addPage({size:'A4', layout:type, margins:{top:10, left:15, right:15}});
        this.addHeader(subtitle, type);

    }
    //Структура объекта, передаваемого в table:
    //{
    //    y: 60,
    //    x: 5
    //    width: 450,
    //    hide-header: false,
    //    headers: [{name:'Col',size:10}],
    //    rows:[
    //        ['col-daa',]
    //    ]
    //}
    table(obj){
        this.inp_obj = obj;
        let cols_pos = [];
        let pos = obj.x;
        let y = obj.y;
        for(let i =0; i < obj.headers.length; i++){
            let bold = false;
            obj.headers[i].bold === undefined? bold = false: bold=obj.headers[i].bold;
            cols_pos.push({pos : pos, size: obj.headers[i].size, align:obj.headers[i].align, bold: bold});
            pos += obj.headers[i].size;
        }
        if(obj.hide_header, cols_pos){
            super.font('ArialBold');
            this.generateHeaders(obj.headers,cols_pos, y);
            y += 20;
        }
        for(let i = 0; i < obj.rows.length; i++){
            super.font('Arial');
            this.GenerateRow(obj.headers.length, obj.rows[i], cols_pos, y);
            y+= this.inp_obj.step;
        }
        

    }

    generateHeaders(headers, colsPos, y){
        super.fontSize(10);
        for(let i = 0; i < headers.length; i++){
            super.text(headers[i].name, colsPos[i].pos,y,{width:colsPos[i].size, align:colsPos[i].align});
        }
        super.moveTo(this.inp_obj.x, this.inp_obj.y+this.inp_obj.step + 5).lineTo(this.inp_obj.x+this.inp_obj.width, this.inp_obj.y + this.inp_obj.step + 5).stroke();
    }

    GenerateRow(ColsQuant, Row, colsPos, y) {
        super.fontSize(8);
        for(let i=0; i < ColsQuant; i++){
            if(colsPos[i].bold == true)
                super.font('ArialBold');
            else
                super.font('Arial');
            super.text(Row[i],colsPos[i].pos,y,{width:colsPos[i].size, align:colsPos[i].align});
        }
    }
    // {
    //     x: 
    //     y:
    //     width:
    //     height:
    //     vstep:
    //     hstep: 
    //     headers: []
    //     racers: [
    //         {
    //             header:{
    //                 num,
    //                 rname,
    //                 pos
    //             },
    //             best_lap:1,
    //             rows:[
    //                 time,
    //                 laps,
    //                 pos,
    //                 lap_time
    //             ]
    //         }
    //     ] //массив объектов с гонщиками
    // }

    TimeTable(obj){
        //Отрисовка заголовков
        let cols = [{name:'Время', size: 35},{name:'Круги', size:35},{name:'Поз.', size:35},{name:'Вр.круга',size:35}];
        this.HeaderTimeTable(3,true,obj.x, obj.y, obj.width, obj.vstep, obj.hstep, cols);
        //Отрисовка ообъектов
        let colNum = 0;
        let refX = obj.x + colNum * (140) + colNum * obj.hstep;
        let refY = obj.y + obj.vstep+5;
        let cur_x = refX;
        let cur_y = refY;
        for(let i = 0; i < obj.racers.length; i++){
            super.fontSize(7);
            super.font('ArialBold');
            super.text('№ '+obj.racers[i].header.num+', '+obj.racers[i].header.rname+',Поз. '+obj.racers[i].header.pos,cur_x,cur_y,{width:140, align:'left'});
            super.font('Arial');
            cur_y += 10;
            for(let rowiter = 1; rowiter < obj.racers[i].rows.length; rowiter++){
                if(cur_y >= obj.height + obj.y){
                    //Проверка на переполнение колонки таблицы и/или страницы
                    if (colNum == 2){
                        this.DaddPage('Покруговка','portrait');
                        this.HeaderTimeTable(3,true, obj.x,obj.y,obj.width, obj.vstep, obj.hstep, cols);
                        colNum = 0;
                    }
                    else {
                        colNum += 1; //kosyak
                    }
                    cur_x = refX = obj.x + colNum * (140) + colNum * obj.hstep;
                    cur_y = refY;
                }
                for(let j = 0; j < cols.length; j++){
                    if (cols.length - j == 1 && obj.racers[i].rows[rowiter][1] == obj.racers[i].best_lap){
                        super.font('ArialBold');
                        super.lineWidth(2);
                        super.lineJoin('butt').rect(cur_x,cur_y-1,cols[j].size, 10).stroke();
                        super.lineWidth(1);
                    }
                    super.text(obj.racers[i].rows[rowiter][j],cur_x, cur_y,{align:'center',width: cols[j].size});
                    cur_x+=cols[j].size;
                    super.font('Arial');
                    //cur_y+=10;
                }
                cur_x = refX;
                cur_y+=10;
            }
            for(let j = 0; j < cols.length; j++){
                super.text('-',cur_x, cur_y,{align:'center',width: cols[j].size});
                cur_x+=cols[j].size;
            }
            cur_x = refX;
            cur_y += obj.vstep;
        }
    }

    HeaderTimeTable(QuantCols, bold, start_x, start_y, width, vstep, hstep, cols){
        super.fontSize(8);
        let x = start_x;
        bold == undefined || bold == false? super.font('Arial'): super.font('ArialBold');
        for(let i = 0; i< QuantCols; i++){
            for(let j=0;j<cols.length;j++){
                super.text(cols[j].name,x, start_y, {width: cols[j].size, align:'center'});
                x += cols[j].size;
            }
            x+=hstep;    
        }   
        super.moveTo(start_x, start_y+10).lineTo(start_x+width, start_y+10).stroke();
        super.font('Arial');
    }
}
module.exports = mpdf;