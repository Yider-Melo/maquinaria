import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared-module';
import { AuthGuard } from '../core/guards/auth-guard';
import { Profile } from './profile';

const routes: Routes = [{ path: '', component: Profile, canActivate: [AuthGuard] }];

@NgModule({ imports: [SharedModule, Profile, RouterModule.forChild(routes)] })
export class ProfileModule {}
