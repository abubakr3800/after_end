@echo off
%time% = date /T 
git add *
git commit -m  %time%
git push