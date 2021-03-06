'use strict'
const exec = require('child_process').exec
const co = require('co')
const prompt = require('co-prompt')
const config = require('../templates')
const chalk = require('chalk')
const path = require('path')
const fs = require('fs')
const ora = require('ora')
const rimraf = require('rimraf')
const checkVersion = require('./check-version')
/**
 *
 * @param origin
 * @param name
 * @param desname
 */
const readDirSync = (origin, name='demo',desname)=> {
    var dir = fs.readdirSync(origin, 'utf-8');
    for (let j of dir) {
        let filepath = path.join(origin, j);
        let filepath_des = path.join(origin, desname)
        let stat = fs.statSync(filepath);
        if (stat.isDirectory()) {
            if (j === name) {
                fs.renameSync(filepath, filepath_des)
                readDirSync(filepath_des, name, desname);
            } else {
                readDirSync(filepath, name, desname);
            }
        } else {
            if (j === name + path.extname(filepath) && path.extname(filepath)) {
                fs.renameSync(filepath, filepath_des + path.extname(filepath))
				// 替换文件中的name=>desname
                replaceNameToDes(filepath_des + path.extname(filepath), name, desname)
            } else if (j === 'cooking.conf.js') {
                replaceNameToDes(filepath, name, desname)
			}
        }
    }
};
/**
 *
 * @param dir
 * @param name
 * @param desname
 */
const replaceNameToDes = (dir, name, desname) => {
    let dataStr = fs.readFileSync(dir, {encoding: 'utf-8'});
	dataStr = dataStr.replace(new RegExp(name, 'g'), desname);
	fs.writeFileSync(dir, dataStr, 'utf8');
}
module.exports =()=>{
	checkVersion(() => {
		co(function*(){
			let projectName = yield prompt('项目名称为: ')
			while (!projectName) {
				projectName = yield prompt('请重新输入项目名称： ')
			}
			let tplName = yield prompt('模板名称为: ');
			let gitUrl;
			let branch;
			if (tplName) {
				if(!config.template[tplName]){
					console.log(chalk.red('\n 模板不存在'))
					process.exit();
				} else {
					gitUrl = config.template[tplName].url;
					branch = config.template[tplName].branch;
				}
			} else {
				gitUrl = config.template['website'].url;
				branch = config.template['website'].branch;
			}
			let cmdStr = `git clone ${gitUrl} ${projectName} && cd ${projectName} && git checkout ${branch}`;
			const spinner = ora(chalk.red('开始构建......')).start();
			setTimeout(() => {
				spinner.color = 'yellow';
				spinner.text = chalk.red('构建中......');
			}, 1000);
			yield (function(){
				return new Promise(function(resolve,reject){
					exec(cmdStr,(error,stdout,stderr)=>{
						if(error) {
							console.log(error)
							process.exit();
						}
						// exec(`rm -rf ./${projectName}/.git`,(error,stdout,stderr) => {
						// 	// process.exit();
						// })
						rimraf.sync(`./${projectName}/.git`)
						resolve()
					})
				})
			})()
			let cur_path = path.join(process.cwd(), projectName)
			// 处理指定文件夹
			readDirSync(cur_path, 'demo', projectName)
			spinner.succeed(chalk.green(' ️ 构建完成'))
			console.log(chalk.red(`请运行: cd ${projectName} && npm install \n`));
			process.exit()
		})
	})
}